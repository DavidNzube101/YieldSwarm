module PortfolioOptimizer

using JuMP
using HiGHS
using Statistics
using LinearAlgebra
using JSON

export optimize_portfolio, calculate_impermanent_loss, calculate_rebalancing_threshold, calculate_arbitrage_opportunity, calculate_position_size

"""
Optimize portfolio allocation using Modern Portfolio Theory
"""
function optimize_portfolio(opportunities::Vector{Dict}, constraints::Dict)
    # Extract data
    n = length(opportunities)
    yields = [opp["expected_yield"] for opp in opportunities]
    risks = [opp["risk_score"] for opp in opportunities]
    
    # Create optimization model
    model = Model(HiGHS.Optimizer)
    
    # Decision variables: allocation to each opportunity
    @variable(model, 0 <= x[1:n] <= constraints["max_allocation_per_opportunity"])
    
    # Constraint: total allocation = 1
    @constraint(model, sum(x) == constraints["total_allocation"])
    
    # Constraint: minimum allocation per opportunity
    for i in 1:n
        @constraint(model, x[i] >= constraints["min_allocation_per_opportunity"])
    end
    
    # Constraint: risk tolerance
    @constraint(model, sum(risks[i] * x[i] for i in 1:n) <= constraints["risk_tolerance"])
    
    # Objective: maximize risk-adjusted yield
    # Using Sharpe ratio approximation: (return - risk_free_rate) / risk
    risk_free_rate = 0.02  # 2% risk-free rate
    
    @objective(model, Max, 
        sum(yields[i] * x[i] for i in 1:n) - 
        0.5 * sum(risks[i] * x[i]^2 for i in 1:n) - 
        risk_free_rate * sum(x[i] for i in 1:n)
    )
    
    # Solve the optimization problem
    optimize!(model)
    
    # Check if solution is optimal
    if termination_status(model) == MOI.OPTIMAL
        # Extract results
        allocations = value.(x)
        
        # Calculate metrics
        total_yield = sum(yields[i] * allocations[i] for i in 1:n)
        total_risk = sum(risks[i] * allocations[i] for i in 1:n)
        sharpe_ratio = (total_yield - risk_free_rate) / total_risk
        
        # Prepare result
        result = Dict(
            "allocations" => [
                Dict(
                    "opportunity_id" => opportunities[i]["id"],
                    "allocation" => allocations[i],
                    "expected_yield" => yields[i],
                    "risk_score" => risks[i],
                    "chain" => opportunities[i]["chain"]
                ) for i in 1:n
            ],
            "total_expected_yield" => total_yield,
            "total_risk" => total_risk,
            "sharpe_ratio" => sharpe_ratio,
            "optimization_status" => "optimal",
            "objective_value" => objective_value(model)
        )
        
        return result
    else
        # Return fallback solution
        return create_fallback_solution(opportunities, constraints)
    end
end

"""
Create fallback solution when optimization fails
"""
function create_fallback_solution(opportunities::Vector{Dict}, constraints::Dict)
    n = length(opportunities)
    
    # Sort by risk-adjusted yield
    risk_adjusted_yields = [
        (i, opportunities[i]["expected_yield"] / (opportunities[i]["risk_score"] + 0.1))
        for i in 1:n
    ]
    sort!(risk_adjusted_yields, by = x -> x[2], rev = true)
    
    # Equal allocation among top opportunities
    top_k = min(5, n)
    equal_allocation = constraints["total_allocation"] / top_k
    
    allocations = zeros(n)
    for (i, _) in risk_adjusted_yields[1:top_k]
        allocations[i] = equal_allocation
    end
    
    # Calculate metrics
    yields = [opp["expected_yield"] for opp in opportunities]
    risks = [opp["risk_score"] for opp in opportunities]
    
    total_yield = sum(yields[i] * allocations[i] for i in 1:n)
    total_risk = sum(risks[i] * allocations[i] for i in 1:n)
    risk_free_rate = 0.02
    sharpe_ratio = total_risk > 0 ? (total_yield - risk_free_rate) / total_risk : 0
    
    result = Dict(
        "allocations" => [
            Dict(
                "opportunity_id" => opportunities[i]["id"],
                "allocation" => allocations[i],
                "expected_yield" => yields[i],
                "risk_score" => risks[i],
                "chain" => opportunities[i]["chain"]
            ) for i in 1:n
        ],
        "total_expected_yield" => total_yield,
        "total_risk" => total_risk,
        "sharpe_ratio" => sharpe_ratio,
        "optimization_status" => "fallback",
        "objective_value" => total_yield - 0.5 * total_risk
    )
    
    return result
end

"""
Calculate impermanent loss for a given price change
"""
function calculate_impermanent_loss(price_ratio::Float64)
    # IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
    if price_ratio <= 0
        return -1.0  # Maximum loss
    end
    
    impermanent_loss = (2 * sqrt(price_ratio)) / (1 + price_ratio) - 1
    return max(impermanent_loss, -1.0)  # Cap at -100%
end

"""
Calculate optimal rebalancing threshold based on portfolio volatility
"""
function calculate_rebalancing_threshold(portfolio_risk::Float64)
    base_threshold = 0.05  # 5% base threshold
    volatility_adjustment = portfolio_risk * 0.1
    
    return max(base_threshold - volatility_adjustment, 0.01)  # Min 1% threshold
end

"""
Calculate cross-chain arbitrage opportunity
"""
function calculate_arbitrage_opportunity(yield1::Float64, yield2::Float64, bridge_cost::Float64)
    yield_diff = abs(yield1 - yield2)
    bridge_cost_apy = bridge_cost * 365 * 100  # Convert to APY
    
    net_benefit = yield_diff - bridge_cost_apy
    is_profitable = net_benefit > 0
    
    confidence = min(net_benefit / 10, 1.0)  # Higher benefit = higher confidence
    
    return Dict(
        "is_profitable" => is_profitable,
        "net_benefit" => net_benefit,
        "yield_difference" => yield_diff,
        "bridge_cost_apy" => bridge_cost_apy,
        "recommended_action" => is_profitable ? "execute_arbitrage" : "hold_positions",
        "confidence" => confidence
    )
end

"""
Calculate optimal position size using Kelly Criterion
"""
function calculate_position_size(expected_yield::Float64, risk_score::Float64, 
                               total_capital::Float64, risk_tolerance::Float64)
    win_rate = 0.6  # Estimated win rate
    avg_win = expected_yield
    avg_loss = risk_score
    
    # Kelly Criterion
    kelly_fraction = (win_rate * avg_win - (1 - win_rate) * avg_loss) / avg_win
    
    # Apply constraints
    max_position_size = min(kelly_fraction, risk_tolerance)
    min_position_size = 0.01  # 1% minimum
    position_size = max(min(max_position_size, 0.2), min_position_size)  # Cap at 20%
    
    return position_size * total_capital
end

end # module PortfolioOptimizer