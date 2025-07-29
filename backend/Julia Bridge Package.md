julia-bridge
0.3.0 • Public • Published 11 years ago

julia-bridge

Call Julia code directly from Node.

npm install julia-bridge

NPM package Build Status
API
compute()

Computes a value and returns it on a callback.

Unfortunately you have to also subscribe to the error stream if you want errors; this does not currently deliver node-style callbacks (i.e. with any errors as first arg).

JuliaProcess = require 'julia-bridge'
julia = new JuliaProcess
 
PROGRAM = """
  function fib(n)
    if n <= 2
      1
    else
      fib(n-1) + fib(n-2)
    end
  end
  return fib(10)
"""
 
julia.on 'ready', ->
  julia.compute PROGRAM, (result) ->
    console.log("Fibonacci value #10 = #{result}")

Or, if you prefer the FRP style:

julia.ready.flatMap ->
    julia.compute PROGRAM
  .map (result) ->
    console.log("Fibonacci value #10 = #{result}")

send()

Sends your code to Julia. You must explicitly @emit any events that you wish to send back to Node.

julia.on 'foo', (message) ->
  console.log "Result reported: #{message}"
 
julia.send """
  @emit 'foo' longRunningComputation()
"""

or as streams:

julia.stream('foo').onValue (message) ->
  console.log "Result reported: #{message}"

Readme
Keywords

    julia
    polyglot
    bridge