module Storage

using JSON
using UUIDs

import ..Agents
import ..Swarms

const DATA_DIR = joinpath(dirname(@__FILE__), "..", "..", "data")
const AGENTS_FILE = joinpath(DATA_DIR, "agents.json")
const SWARMS_FILE = joinpath(DATA_DIR, "swarms.json")

function __init__()
    mkpath(DATA_DIR)
end

function save_data()
    open(AGENTS_FILE, "w") do f
        JSON.print(f, Dict(string(uuid) => Agents.to_dict(agent) for (uuid, agent) in Agents.AGENTS))
    end
    open(SWARMS_FILE, "w") do f
        JSON.print(f, Dict(string(uuid) => Swarms.to_dict(swarm) for (uuid, swarm) in Swarms.SWARMS))
    end
    println("Data saved to $AGENTS_FILE and $SWARMS_FILE")
end

function load_data()
    mkpath(DATA_DIR)
    println("Data directory: $DATA_DIR")
    if isfile(AGENTS_FILE)
        open(AGENTS_FILE, "r") do f
            data = JSON.parse(f)
            for (uuid_str, agent_data) in data
                uuid = UUID(uuid_str)
                Agents.AGENTS[uuid] = Agents.Agent(
                    uuid,
                    agent_data["name"],
                    agent_data["type"],
                    get(agent_data, "chain", nothing),
                    agent_data["config"],
                    agent_data["status"],
                    nothing # Task is not persisted
                )
            end
        end
        println("Agents loaded from $AGENTS_FILE")
    end

    if isfile(SWARMS_FILE)
        open(SWARMS_FILE, "r") do f
            data = JSON.parse(f)
            for (uuid_str, swarm_data) in data
                uuid = UUID(uuid_str)
                # Reconstruct agents within the swarm
                agents = [Agents.Agent(
                    UUID(a["id"]),
                    a["name"],
                    a["type"],
                    get(a, "chain", nothing),
                    a["config"],
                    a["status"],
                    nothing
                ) for a in swarm_data["agents"]]

                Swarms.SWARMS[uuid] = Swarms.Swarm(
                    uuid,
                    swarm_data["name"],
                    swarm_data["algorithm"],
                    swarm_data["config"],
                    swarm_data["status"],
                    agents,
                    nothing # Task is not persisted
                )
            end
        end
        println("Swarms loaded from $SWARMS_FILE")
    end
end

end # module Storage