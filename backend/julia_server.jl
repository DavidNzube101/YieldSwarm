using Sockets
using JSON
using JuMP
using HiGHS
using Statistics
using LinearAlgebra
using UUIDs
using HTTP

# --- Custom .env loader ---
function load_dotenv(path)
    try
        if !isfile(path)
            println("Warning: .env file not found at $path")
            return
        end
        for line in eachline(path)
            line = strip(line)
            if !isempty(line) && !startswith(line, '#')
                if occursin('=', line)
                    key, value = split(line, '=', limit=2)
                    key = strip(key)
                    value = strip(value)
                    # Remove quotes if they exist
                    if startswith(value, '"') && endswith(value, '"')
                        value = value[2:end-1]
                    end
                    ENV[key] = value
                end
            end
        end
        println("Successfully loaded environment variables from $path")
    catch e
        println("Warning: Could not load .env file at $path. Error: $e")
    end
end

# Load environment variables from ../test.env
load_dotenv("../test.env")


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

# --- LLM Integration ---
function llm_chat(provider::String, prompt::String, config::Dict)
    hf_token = ENV["HF_TOKEN"]
    api_url = "https://router.huggingface.co/v1/chat/completions"
    
    headers = Dict(
        "Authorization" => "Bearer " * hf_token,
        "Content-Type" => "application/json"
    )
    
    payload = Dict(
        "messages" => [
            Dict("role" => "user", "content" => prompt)
        ],
        "model" => "zai-org/GLM-4.5-Air:fireworks-ai",
        "stream" => false
    )
    
    try
        response = HTTP.post(api_url, headers, JSON.json(payload))
        response_body = JSON.parse(String(response.body))
        
        # Extract the content from the response
        llm_response_content = response_body["choices"][1]["message"]["content"]
        
        return Dict(
            "response" => llm_response_content,
            "provider" => provider,
            "model" => get(config, "model", "zai-org/GLM-4.5-Air:fireworks-ai"),
            "usage" => get(response_body, "usage", Dict("tokens" => length(prompt)))
        )
    catch e
        println("Error calling Hugging Face API: $e")
        # Fallback to a simple error message
        return Dict(
            "response" => JSON.json(Dict("error" => "Failed to get response from LLM.")),
            "provider" => provider,
            "model" => get(config, "model", "zai-org/GLM-4.5-Air:fireworks-ai"),
            "usage" => Dict("tokens" => length(prompt))
        )
    end
end

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
    end,

    # --- LLM Commands ---
    "llm.chat" => (params) -> begin
        provider = get(params, "provider", "echo")
        prompt = get(params, "prompt", "")
        config = get(params, "config", Dict())
        llm_chat(provider, prompt, config)
    end,

    "llm.analyze_opportunity" => (params) -> begin
        provider = get(params, "provider", "echo")
        opportunity = get(params, "opportunity", Dict())
        market_context = get(params, "market_context", Dict())
        
        prompt = """
        Analyze this DeFi yield opportunity:
        Opportunity: $(JSON.json(opportunity))
        Market Context: $(JSON.json(market_context))
        
        Provide analysis on:
        1. Risk assessment (1-10 scale)
        2. Expected yield potential
        3. Liquidity considerations
        4. Smart contract risks
        5. Recommended allocation (0-100%)
        
        Format your response as JSON.
        """
        
        result = llm_chat(provider, prompt, get(params, "config", Dict()))
        result
    end,

    "llm.assess_portfolio_risk" => (params) -> begin
        provider = get(params, "provider", "echo")
        portfolio = get(params, "portfolio", [])
        risk_metrics = get(params, "risk_metrics", Dict())
        
        prompt = """
        Assess the risk of this DeFi portfolio:
        Portfolio: $(JSON.json(portfolio))
        Risk Metrics: $(JSON.json(risk_metrics))
        
        Analyze:
        1. Overall portfolio risk (1-10 scale)
        2. Specific risk factors (impermanent loss, volatility, etc.)
        3. Concentration risks
        4. Cross-chain risks
        5. Recommended risk mitigation strategies
        
        Format your response as JSON.
        """
        
        result = llm_chat(provider, prompt, get(params, "config", Dict()))
        result
    end,

    "llm.optimize_allocation" => (params) -> begin
        provider = get(params, "provider", "echo")
        opportunities = get(params, "opportunities", [])
        constraints = get(params, "constraints", Dict())
        
        prompt = """
        Optimize portfolio allocation for these DeFi opportunities:
        Opportunities: $(JSON.json(opportunities))
        Constraints: $(JSON.json(constraints))
        
        Create an optimal allocation that:
        1. Maximizes expected yield
        2. Manages risk within constraints
        3. Diversifies across chains and protocols
        4. Considers liquidity and execution costs
        
        Return allocation as JSON with opportunity IDs and percentages.
        """
        
        result = llm_chat(provider, prompt, get(params, "config", Dict()))
        result
    end,

    "llm.discover_opportunities" => (params) -> begin
        provider = get(params, "provider", "echo")
        chain = get(params, "chain", "unknown")
        market_data = get(params, "market_data", Dict())

        prompt = """
        Discover DeFi yield opportunities on the given chain:
        Chain: $(chain)
        Market Data: $(JSON.json(market_data))

        Discover opportunities with:
        1. High APY
        2. High TVL
        3. Low risk

        Return a list of opportunities as a JSON array.
        """

        result = llm_chat(provider, prompt, get(params, "config", Dict()))
        result
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