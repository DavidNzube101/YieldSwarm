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
        "config" => agent.config,
        "status" => agent.status
    )
end

# --- In-Memory Storage ---

const AGENTS = Dict{UUID, Agent}()
const AGENT_TASKS = Dict{UUID, Task}()

const YIELD_OPPORTUNITIES = Dict{String, Dict}() # Stores opportunities by ID
const ANALYZED_OPPORTUNITIES = Dict{String, Dict}() # Stores analyzed opportunities by ID

# --- Agent Logic ---

function run_discovery_agent(agent::Agent)
    println("Starting discovery agent $(agent.name)")
    while agent.status == "running"
        # Simulate finding yield opportunities
        println("Discovery agent $(agent.name) is searching for opportunities...")
        
        # Generate a mock opportunity
        opp_id = string(uuid4())
        opportunity = Dict(
            "id" => opp_id,
            "name" => "MockYield_$(rand(1:100))",
            "expected_yield" => round(rand() * 0.2 + 0.05, digits=4), # 5% to 25%
            "risk_score" => round(rand() * 0.1, digits=4), # 0% to 10%
            "chain" => rand(["ethereum", "bsc", "polygon", "arbitrum"]),
            "protocol" => rand(["Aave", "Compound", "Curve"])
        )
        YIELD_OPPORTUNITIES[opp_id] = opportunity
        println("Discovery agent $(agent.name) found opportunity: $(opportunity["name"]) on $(opportunity["chain"]) with yield $(opportunity["expected_yield"]*100)%")
        sleep(10)
    end
    println("Discovery agent $(agent.name) stopped.")
end

function run_trading_agent(agent::Agent)
    println("Starting trading agent $(agent.name)")
    while agent.status == "running"
        # Simulate executing trades
        println("Trading agent $(agent.name) is executing trades...")
        sleep(5)
    end
    println("Trading agent $(agent.name) stopped.")
end

function run_analysis_agent(agent::Agent)
    println("Starting analysis agent $(agent.name)")
    while agent.status == "running"
        println("Analysis agent $(agent.name) is analyzing market data...")
        println("Analysis agent $(agent.name): Current YIELD_OPPORTUNITIES: ", collect(keys(YIELD_OPPORTUNITIES)))

        # Read from YIELD_OPPORTUNITIES and process new ones
        # Create a list of IDs to process in this cycle to avoid modifying dict during iteration
        opportunities_to_process_ids = String[]
        for (id, opportunity) in YIELD_OPPORTUNITIES
            push!(opportunities_to_process_ids, id)
        end
        println("Analysis agent $(agent.name): Opportunities to process in this cycle: ", opportunities_to_process_ids)

        if isempty(opportunities_to_process_ids)
            println("Analysis agent $(agent.name): No new opportunities to analyze. Waiting...")
        else
            for id in opportunities_to_process_ids
                # Ensure opportunity still exists and hasn't been processed by another concurrent agent (if any)
                if haskey(YIELD_OPPORTUNITIES, id) && !haskey(ANALYZED_OPPORTUNITIES, id)
                    println("Analysis agent $(agent.name): Processing opportunity ID: ", id)
                    opportunity = YIELD_OPPORTUNITIES[id]

                    try
                        # Simulate analysis: calculate a risk-adjusted yield
                        risk_adjusted_yield = opportunity["expected_yield"] / (opportunity["risk_score"] + 0.01) # Add small constant to avoid division by zero
                        
                        analyzed_opp = deepcopy(opportunity)
                        analyzed_opp["risk_adjusted_yield"] = risk_adjusted_yield
                        analyzed_opp["analysis_timestamp"] = string(now())

                        # Use PortfolioOptimizer functions for more detailed analysis
                        # Example: Calculate impermanent loss for a mock price ratio
                        mock_price_ratio = rand() * 2.0 # Simulate price change between 0 and 2
                        il = PortfolioOptimizer.calculate_impermanent_loss(mock_price_ratio)
                        analyzed_opp["impermanent_loss"] = il

                        # Example: Calculate arbitrage opportunity (mock values)
                        mock_yield1 = opportunity["expected_yield"]
                        mock_yield2 = rand() * 0.2 # Another mock yield
                        mock_bridge_cost = rand() * 0.001 # Mock bridge cost
                        arbitrage_result = PortfolioOptimizer.calculate_arbitrage_opportunity(mock_yield1, mock_yield2, mock_bridge_cost)
                        analyzed_opp["arbitrage_opportunity"] = arbitrage_result

                        # Example: Calculate position size
                        mock_total_capital = 10000.0
                        mock_risk_tolerance = 0.1
                        position_size = PortfolioOptimizer.calculate_position_size(
                            opportunity["expected_yield"], 
                            opportunity["risk_score"], 
                            mock_total_capital, 
                            mock_risk_tolerance
                        )
                        analyzed_opp["recommended_position_size"] = position_size

                        ANALYZED_OPPORTUNITIES[id] = analyzed_opp
                        println("Analysis agent $(agent.name) analyzed opportunity $(opportunity["name"]) with risk-adjusted yield: $(risk_adjusted_yield)")
                        Events.publish(:opportunity_analyzed, analyzed_opp)

                        if arbitrage_result["is_profitable"]
                            println("Analysis agent $(agent.name) found profitable arbitrage opportunity: $(arbitrage_result["net_benefit"])")
                            Events.publish(:arbitrage_found, arbitrage_result)
                        end

                        # Crucially: Remove from YIELD_OPPORTUNITIES after processing
                        delete!(YIELD_OPPORTUNITIES, id)
                        println("Analysis agent $(agent.name): Deleted opportunity ID ", id, " from YIELD_OPPORTUNITIES.")
                    catch e
                        println("Analysis agent $(agent.name): Error analyzing opportunity ", id, ": ", e)
                    end
                else
                    println("Analysis agent $(agent.name): Skipping opportunity ID ", id, " (already analyzed or not found).")
                end
            end
        end
        println("Analysis agent $(agent.name): Current ANALYZED_OPPORTUNITIES: ", collect(keys(ANALYZED_OPPORTUNITIES)))
        sleep(7)
    end
    println("Analysis agent $(agent.name) stopped.")
end

# --- Agent Management Functions ---

function create_agent(name::String, type::String, config::Dict)
    id = uuid4()
    agent = Agent(id, name, type, config, "stopped", nothing)
    AGENTS[id] = agent
    Events.publish(:agent_created, Dict("id" => string(id), "name" => name, "type" => type))
    return to_dict(agent)
end

function get_agent(id::UUID)
    return to_dict(AGENTS[id])
end

function start_agent(id::UUID)
    agent = AGENTS[id]
    if agent.status == "stopped"
        agent.status = "running"
        if agent.type == "Discovery"
            task = @async run_discovery_agent(agent)
            AGENT_TASKS[id] = task
        elseif agent.type == "Trading"
            task = @async run_trading_agent(agent)
            AGENT_TASKS[id] = task
        elseif agent.type == "Analysis"
            task = @async run_analysis_agent(agent)
            AGENT_TASKS[id] = task
        end
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