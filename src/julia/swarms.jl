module Swarms

using UUIDs

using ..Agents
using ..PortfolioOptimizer
import ..Events

export Swarm, create_swarm, get_swarm, start_swarm, stop_swarm, delete_swarm, list_swarms, add_agent_to_swarm, remove_agent_from_swarm

# --- Swarm Definition ---

mutable struct Swarm
    id::UUID
    name::String
    algorithm::Dict
    config::Dict
    status::String
    agents::Vector{Agent}
    task::Union{Task, Nothing}
end

# --- Conversion to Dict ---

function to_dict(swarm::Swarm)
    return Dict(
        "id" => string(swarm.id),
        "name" => swarm.name,
        "algorithm" => swarm.algorithm,
        "config" => swarm.config,
        "status" => swarm.status,
        "agents" => [Agents.to_dict(agent) for agent in swarm.agents]
    )
end

# --- In-Memory Storage ---

const SWARMS = Dict{UUID, Swarm}()
const SWARM_TASKS = Dict{UUID, Task}()

# --- Swarm Logic ---

function run_swarm(swarm::Swarm)
    println("Starting swarm $(swarm.name)")
    while swarm.status == "running"
        println("Swarm $(swarm.name) is optimizing...")

        opportunities_dict = Agents.ANALYZED_OPPORTUNITIES
        if isempty(opportunities_dict)
            println("Swarm $(swarm.name): No analyzed opportunities found yet. Waiting...")
            sleep(5)
            continue
        end
        opportunities = collect(values(opportunities_dict))

        constraints = Dict(
            "max_allocation_per_opportunity" => get(swarm.config, "max_allocation_per_opportunity", 0.5),
            "total_allocation" => get(swarm.config, "total_allocation", 1.0),
            "min_allocation_per_opportunity" => get(swarm.config, "min_allocation_per_opportunity", 0.01),
            "risk_tolerance" => get(swarm.config, "risk_tolerance", 0.06)
        )

        try
            if get(swarm.algorithm, "type", "PortfolioOptimization") == "PortfolioOptimization"
                optimization_result = PortfolioOptimizer.optimize_portfolio(opportunities, constraints)
                println("Optimization Result for Swarm $(swarm.name) (PortfolioOptimization): ", optimization_result)
                Events.publish(:swarm_optimized, Dict("swarm_id" => string(swarm.id), "algorithm" => "PortfolioOptimization", "result" => optimization_result))
            elseif get(swarm.algorithm, "type", "") == "PSO"
                # Placeholder for PSO algorithm
                println("Swarm $(swarm.name): Running PSO algorithm (placeholder).")
                # In a real scenario, you would call a PSO-specific function here
                # e.g., pso_result = PSO.optimize(opportunities, constraints, swarm.algorithm["params"])
                # Events.publish(:swarm_optimized, Dict("swarm_id" => string(swarm.id), "algorithm" => "PSO", "result" => pso_result))
            else
                println("Swarm $(swarm.name): Unknown algorithm type: ", get(swarm.algorithm, "type", ""))
            end
        catch e
            println("Error during optimization for Swarm $(swarm.name): ", e)
        end

        sleep(15)
    end
    println("Swarm $(swarm.name) stopped.")
end

# --- Swarm Management Functions ---

function create_swarm(name::String, algorithm::Dict, config::Dict)
    id = uuid4()
    swarm = Swarm(id, name, algorithm, config, "stopped", [], nothing)
    SWARMS[id] = swarm
    Events.publish(:swarm_created, Dict("id" => string(id), "name" => name, "algorithm" => algorithm))
    return to_dict(swarm)
end

function get_swarm(id::UUID)
    return to_dict(SWARMS[id])
end

function start_swarm(id::UUID)
    swarm = SWARMS[id]
    if swarm.status == "stopped"
        swarm.status = "running"
        task = @async run_swarm(swarm)
        SWARM_TASKS[id] = task
        Events.publish(:swarm_started, Dict("id" => string(id), "name" => swarm.name, "status" => swarm.status))
    end
    return to_dict(swarm)
end

function stop_swarm(id::UUID)
    swarm = SWARMS[id]
    if swarm.status == "running"
        swarm.status = "stopped"
        if haskey(SWARM_TASKS, id)
            delete!(SWARM_TASKS, id)
        end
        Events.publish(:swarm_stopped, Dict("id" => string(id), "name" => swarm.name, "status" => swarm.status))
    end
    return to_dict(swarm)
end

function delete_swarm(id::UUID)
    if haskey(SWARMS, id)
        stop_swarm(id)
        delete!(SWARMS, id)
    end
    return Dict("status" => "deleted", "id" => string(id))
end

function list_swarms()
    return [to_dict(swarm) for swarm in values(SWARMS)]
end

function add_agent_to_swarm(swarm_id::UUID, agent_id::UUID)
    agent = Agents.AGENTS[agent_id]
    push!(SWARMS[swarm_id].agents, agent)
    return to_dict(SWARMS[swarm_id])
end

function remove_agent_from_swarm(swarm_id::UUID, agent_id::UUID)
    filter!(a -> a.id != agent_id, SWARMS[swarm_id].agents)
    return to_dict(SWARMS[swarm_id])
end

end # module Swarms