module Agents

using UUIDs
using Dates

import ..Events
using ..PortfolioOptimizer

export Agent, create_agent, get_agent, start_agent, stop_agent, delete_agent, list_agents

# --- Agent Definition ---

mutable struct Agent
    id::UUID
    name::String
    type::String
    chain::Union{String, Nothing}
    config::Dict
    status::String
    task::Union{Task, Nothing}
end

# --- Conversion to Dict ---
function to_dict(agent::Agent)
    return Dict(
        "id" => string(agent.id),
        "name" => agent.name,
        "type" => agent.type,
        "chain" => agent.chain,
        "config" => agent.config,
        "status" => agent.status
    )
end

# --- In-Memory Storage ---

const AGENTS = Dict{UUID, Agent}()
const AGENT_TASKS = Dict{UUID, Task}()



# --- Agent Logic ---







# --- Agent Management Functions ---

function create_agent(name::String, type::String, chain::Union{String, Nothing}, config::Dict)
    id = uuid4()
    agent = Agent(id, name, type, chain, config, "stopped", nothing)
    AGENTS[id] = agent
    Events.publish(:agent_created, Dict("id" => string(id), "name" => name, "type" => type, "chain" => chain))
    return to_dict(agent)
end

function get_agent(id::UUID)
    return to_dict(AGENTS[id])
end

function start_agent(id::UUID)
    agent = AGENTS[id]
    if agent.status == "stopped"
        agent.status = "running"
        Events.publish(:agent_started, Dict("id" => string(id), "name" => agent.name, "type" => agent.type))
    end
    return to_dict(agent)
end

function stop_agent(id::UUID)
    agent = AGENTS[id]
    if agent.status == "running"
        agent.status = "stopped"
        if haskey(AGENT_TASKS, id)
            # We can't directly kill the task, but changing the status will cause it to exit the loop
            # For more complex scenarios, we would need a more sophisticated cancellation mechanism
            delete!(AGENT_TASKS, id)
        end
        Events.publish(:agent_stopped, Dict("id" => string(id), "name" => agent.name, "type" => agent.type))
    end
    return to_dict(agent)
end

function delete_agent(id::UUID)
    if haskey(AGENTS, id)
        stop_agent(id) # Ensure the agent is stopped before deleting
        delete!(AGENTS, id)
    end
    return Dict("status" => "deleted", "id" => string(id))
end

function list_agents()
    return [to_dict(agent) for agent in values(AGENTS)]
end

end # module Agents