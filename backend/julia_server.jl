using Sockets
using JSON
using JuMP
using HiGHS
using Statistics
using LinearAlgebra
using UUIDs

# Tell JSON.jl how to serialize UUIDs
JSON.lower(id::UUID) = string(id)

# Include the project modules (these define the modules)
include("../src/julia/events.jl") # Events must be included first
include("../src/julia/portfolio_optimizer.jl") # PortfolioOptimizer must be included before Agents and Swarms
include("../src/julia/agents.jl")
include("../src/julia/swarms.jl")
include("../src/julia/storage.jl") # Storage needs Agents and Swarms, so it comes after

# Bring the modules into scope
using .Agents
using .Swarms
using .PortfolioOptimizer
using .Storage
using .Events

# --- Command Dispatcher ---

const COMMANDS = Dict(
    "agents.list_agents" => (params) -> Agents.list_agents(),
    "agents.create_agent" => (params) -> begin
        agent = Agents.create_agent(params[1], params[2], params[3], params[4])
        Storage.save_data()
        return agent
    end,
    "agents.get_agent" => (params) -> Agents.get_agent(UUID(params["id"])),
    "agents.start_agent" => (params) -> begin
        agent = Agents.start_agent(UUID(params["id"]))
        Storage.save_data()
        return agent
    end,
    "agents.stop_agent" => (params) -> begin
        agent = Agents.stop_agent(UUID(params["id"]))
        Storage.save_data()
        return agent
    end,
    "agents.delete_agent" => (params) -> begin
        result = Agents.delete_agent(UUID(params["id"]))
        Storage.save_data()
        return result
    end,

    "swarms.list_swarms" => (params) -> Swarms.list_swarms(),
    "swarms.create_swarm" => (params) -> begin
        swarm = Swarms.create_swarm(params["name"], params["algorithm"], params["config"])
        Storage.save_data()
        return swarm
    end,
    "swarms.get_swarm" => (params) -> Swarms.get_swarm(UUID(params["id"])),
    "swarms.start_swarm" => (params) -> begin
        swarm = Swarms.start_swarm(UUID(params["id"]))
        Storage.save_data()
        return swarm
    end,
    "swarms.stop_swarm" => (params) -> begin
        swarm = Swarms.stop_swarm(UUID(params["id"]))
        Storage.save_data()
        return swarm
    end,
    "swarms.delete_swarm" => (params) -> begin
        result = Swarms.delete_swarm(UUID(params["id"]))
        Storage.save_data()
        return result
    end,
    "swarms.add_agent" => (params) -> begin
        swarm = Swarms.add_agent_to_swarm(UUID(params["swarm_id"]), UUID(params["agent_id"]))
        Storage.save_data()
        return swarm
    end,
    "swarms.remove_agent" => (params) -> begin
        swarm = Swarms.remove_agent_from_swarm(UUID(params["swarm_id"]), UUID(params["agent_id"]))
        Storage.save_data()
        return swarm
    end,

    "portfolio.get_available_algorithms" => (params) -> PortfolioOptimizer.get_available_algorithms(),

    "portfolio.optimize" => (params) -> begin
        if get(ENV, "JULIA_LOG_LEVEL", "info") == "debug"
            println("DEBUG: Type of params: ", typeof(params))
            println("DEBUG: Type of opportunities: ", typeof(params["opportunities"]))
            println("DEBUG: Type of constraints: ", typeof(params["constraints"]))
            if !isempty(params["opportunities"])
                println("DEBUG: Type of first opportunity: ", typeof(params["opportunities"][1]))
                println("DEBUG: Type of expected_yield in first opportunity: ", typeof(params["opportunities"][1]["expected_yield"]))
            end
            println("DEBUG: Type of risk_tolerance in constraints: ", typeof(params["constraints"]["risk_tolerance"]))
        end
        PortfolioOptimizer.optimize_portfolio(params["opportunities"], params["constraints"])
    end
)

function handle_command(req)
    cmd = req["command"]
    params = req["params"]

    if haskey(COMMANDS, cmd)
        handler = COMMANDS[cmd]
        try
            result = handler(params)
            return Dict("jsonrpc" => "2.0", "result" => result, "id" => req["id"])
        catch e
            return Dict("jsonrpc" => "2.0", "error" => Dict("code" => -32603, "message" => "Internal error: $e"), "id" => req["id"])
        end
    else
        return Dict("jsonrpc" => "2.0", "error" => Dict("code" => -32601, "message" => "Method not found: $cmd"), "id" => req["id"])
    end
end

# --- Event Handlers ---
function handle_agent_created(data)
    println("Event: Agent Created - ", data)
end

function handle_agent_started(data)
    println("Event: Agent Started - ", data)
end

function handle_agent_stopped(data)
    println("Event: Agent Stopped - ", data)
end

function handle_swarm_created(data)
    println("Event: Swarm Created - ", data)
end

function handle_swarm_started(data)
    println("Event: Swarm Started - ", data)
end

function handle_swarm_stopped(data)
    println("Event: Swarm Stopped - ", data)
end

# --- TCP Server ---

function start_server(host, port)
    server = listen(Sockets.parse(IPAddr, host), port)
    println("Julia backend listening on $host:$port")

    Storage.load_data() # Load data on startup

    # Set the event sink for network transmission
    Events.set_event_sink((msg) -> begin
        # This function will be called by Events.publish to send events over the network
        # We need to get the client connection from somewhere. For now, we'll assume
        # there's an active connection. In a real scenario, this would be more robust.
        # For simplicity, we'll just print it here.
        println("Sending event over network: $msg")
        # In a real implementation, you'd write to the client socket here.
        # For now, we'll rely on the client to poll or for a dedicated event channel.
    end)

    # Subscribe to events for logging
    Events.subscribe(:agent_created, handle_agent_created)
    Events.subscribe(:agent_started, handle_agent_started)
    Events.subscribe(:agent_stopped, handle_agent_stopped)
    Events.subscribe(:swarm_created, handle_swarm_created)
    Events.subscribe(:swarm_started, handle_swarm_started)
    Events.subscribe(:swarm_stopped, handle_swarm_stopped)

    while true
        conn = accept(server)
        @async begin
            try
                # When a client connects, set the event sink to send events to this client
                Events.set_event_sink((msg) -> write(conn, msg))
                while !eof(conn)
                    line = readline(conn)
                    if !isempty(line)
                        req = JSON.parse(line)
                        response = handle_command(req)
                        write(conn, JSON.json(response) * "\n")
                    end
                end
            catch e
                println("Error handling client: $e")
            finally
                close(conn)
                # Reset event sink when client disconnects
                Events.set_event_sink((msg) -> println("Sending event over network: $msg"))
            end
        end
    end
end

# --- Main ---

if abspath(PROGRAM_FILE) == @__FILE__
    # Get host and port from command line arguments or use defaults
    host = length(ARGS) > 0 ? ARGS[1] : "127.0.0.1"
    port = length(ARGS) > 1 ? parse(Int, ARGS[2]) : 8052

    start_server(host, port)
end