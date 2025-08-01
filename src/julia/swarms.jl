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
        println("Swarm $(swarm.name) is performing background tasks...")
        # Placeholder for future Julia-side swarm coordination logic
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