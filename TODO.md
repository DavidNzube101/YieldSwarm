# YieldSwarm Project TODO List

*   [x] **Integrate Official JuliaOS SDK:**
    *   [x] Find and install the official SDK package.
    *   [x] Refactor all agents and services to use the official SDK instead of `JuliaOSMock.ts`.
    *   [x] Delete the `JuliaOSMock.ts` file.
*   [ ] **Write a Test Suite:**
    *   [ ] Create a `test/` directory.
    *   [ ] Add unit tests for key logic (e.g., `YieldCalculator`).
    *   [ ] Add integration tests to verify agent communication via the new SDK.
*   [x] **Enhance the CLI:**
    *   [ ] Replicate the core functionalities of the web UI (e.g., view agents/swarms, see opportunities, get alerts).
    *   [ ] Add commands to manage the swarm lifecycle from the command line.
*   [x] **Add UI Mock Data Feature:**
    *   [ ] Create a new section in the UI.
    *   [ ] Add a form where a user can paste JSON data for mock `YieldOpportunity` objects.
    *   [ ] Create a new API endpoint to receive this data and broadcast it through the `SwarmCoordinator` for testing purposes.
*   [x] **Code Cleanup:**
    *   [ ] Review and remove any unnecessary console logs or debug messages.
    *   [ ] Ensure consistent formatting and style across the codebase.
    *   [ ] Add comments to complex or non-obvious sections of code.