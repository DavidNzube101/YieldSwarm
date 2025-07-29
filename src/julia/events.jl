module Events

using JSON

const HANDLERS = Dict{Symbol, Vector{Function}}()
const EVENT_SINK = Ref{Any}(nothing) # A reference to a function that sends events over the network

"""
Set the function to send events over the network.
"""
function set_event_sink(sink::Function)
    EVENT_SINK[] = sink
end

"""
Subscribe a handler function to an event type.
"""
function subscribe(event_type::Symbol, handler::Function)
    if !haskey(HANDLERS, event_type)
        HANDLERS[event_type] = Function[]
    end
    push!(HANDLERS[event_type], handler)
    println("Subscribed handler to event: $event_type")
end

"""
Publish an event, triggering all subscribed handlers and sending over network if sink is set.
"""
function publish(event_type::Symbol, data::Dict)
    # Trigger local handlers
    if haskey(HANDLERS, event_type)
        for handler in HANDLERS[event_type]
            try
                handler(data)
            catch e
                println("Error in event handler for $event_type: $e")
            end
        end
    end

    # Send over network if sink is set
    if EVENT_SINK[] !== nothing
        try
            event_message = Dict("event" => string(event_type), "data" => data)
            EVENT_SINK[](JSON.json(event_message) * "\n")
        catch e
            println("Error sending event over network: $e")
        end
    end
end

end # module Events
