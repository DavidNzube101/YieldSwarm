# Julia Backend Setup

This document outlines the steps to set up and run the Julia backend for YieldSwarm.

## Prerequisites

- **Julia:** Ensure you have Julia installed on your system. You can download it from [julialang.org](https://julialang.org/).
- **Julia Packages:** The backend requires the following Julia packages:
  - `Sockets` (standard library)
  - `JSON`
  - `JuMP`
  - `HiGHS`

## Installation

1. **Install Julia:** Follow the instructions on the Julia website to install Julia for your operating system.

2. **Install Packages:** Open a Julia REPL and run the following commands to install the required packages:

   ```julia
   using Pkg
   Pkg.add("JSON")
   Pkg.add("JuMP")
   Pkg.add("HiGHS")
   ```

## Running the Backend

1. **Start the Server:** Open a terminal and navigate to the `backend` directory of the YieldSwarm project.

2. **Run the Server:** Execute the following command to start the Julia backend server:

   ```bash
   julia julia_server.jl
   ```

   By default, the server will start on `127.0.0.1:8052`. You can specify a different host and port as command-line arguments:

   ```bash
   julia julia_server.jl <host> <port>
   ```

## Connecting from Node.js

The Node.js backend connects to the Julia backend using the `JuliaBridge`. The connection details are configured in the `JuliaBridge` constructor.

```typescript
// backend/JuliaBridge.ts

import { JuliaBridge as JuliaBridgeClient } from 'julia-bridge';

export class JuliaBridge {
  private client: JuliaBridgeClient;

  constructor() {
    this.client = new JuliaBridgeClient({
      host: process.env.JULIA_HOST || '127.0.0.1',
      port: parseInt(process.env.JULIA_PORT || '8052', 10),
    });
  }

  // ...
}
```

To configure the connection, you can set the `JULIA_HOST` and `JULIA_PORT` environment variables. If these variables are not set, the bridge will default to `127.0.0.1:8052`.
