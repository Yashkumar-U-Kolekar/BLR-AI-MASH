# Agent Workflow & Design Principles

This document explains the architectural principles guiding the design, execution, and structure of AI agent workflows and communication networks in the M.A.S.H ecosystem.

---

## 1. Rooms (Persistent Infrastructure) vs. Workflows (Dynamic Sessions)

To balance network efficiency with execution state isolation, M.A.S.H separates the communication channels from the transaction states.

### Persistent Communication Channels (Rooms)
Virtual rooms (e.g., `Patient-Management-Room`, `Pharmacy-Inventory-Room`) are treated as **long-lived, persistent message buses**.
* **Anti-Pattern**: Recreating a room dynamically for every transaction or event message.
* **Why**: Dynamic creation adds significant network latency (API overhead) and prevents other static agents from locating the correct channel ID.
* **Pattern**: Rooms are initialized once during server/agent startup and mapped persistently via `.env.rooms`.

### Dynamic Event Sessions (Workflows)
While rooms are static, the **individual workflow instances** (such as a single patient booking an appointment or checking medication stock) are short-lived, transaction-bound sessions.
* **Pattern**: When a workflow starts, the initiator generates a unique transaction token (`requestId` via UUID) and attaches it to the payload.
* **Handling Concurrency**: Awaiting agents track transaction states via local maps of `asyncio.Future` promises. The workflow session terminates cleanly when the target agent returns a response carrying the matching `requestId`, resolving the future.

---

## 2. Static Graph Structure vs. Dynamic Flow Execution

All backend coordinator agents in M.A.S.H utilize `LangGraph` state graphs. We strictly differentiate between graph layout structure and state execution paths.

```
+-------------------------------------------------------------+
|               STATIC GRAPH STRUCTURE (Compiled)            |
|                                                             |
|   [START] ---> [Symptom Parser] ---> (Specialty Route?)     |
|                                              |              |
|                                       +------+------+       |
|                                       |             |       |
|                                  [Cardiology]  [Pediatrics] |
|                                       |             |       |
|                                       +------+------+       |
|                                              |              |
|                                           [END]             |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             DYNAMIC FLOW EXECUTION (Runtime)                |
|                                                             |
|   * Thread A (Patient 1: "Heart pain")  --> Cardiology Path |
|   * Thread B (Patient 2: "Feverish")    --> Pediatrics Path |
+-------------------------------------------------------------+
```

### Static Graph Definitions (Blueprints)
The workflow layout—comprising nodes, conditional edges, and schema structure—is **statically compiled at agent startup**.
* **Why**: 
  * **Clinical Safety & Determinism**: Pre-defining the layout ensures safety checks (like drug conflict warnings or human-in-the-loop approvals) are structurally guaranteed to run and cannot be bypassed.
  * **Traceability & Verification**: Compiling graphs allows structural validation and edge-case unit testing before code is deployed.

### Dynamic Flow Execution (Thread Instances)
When a listener intercepts an event, it executes the graph asynchronously by feeding in a new state payload:
```python
await self.graph.ainvoke({"event_name": "BOOKING_REQUESTED", "payload": payload})
```
* **Why**: Invoking the compiled graph dynamically creates an isolated execution thread for that single request. This prevents data/state leakage when multiple patient flows run concurrently.

---

## 3. Adapting to Complex Scenarios

M.A.S.H utilizes two patterns to support flexible, adaptive agent behaviors within our safety-first system:

### Pattern A: Dynamic Routing (Conditional Edges)
Within a static graph structure, we use data-driven conditional edges to choose the execution path dynamically.
* *Example*: In `MedicineManagementAgent`, the structure has predefined nodes for `Prepare Medication` and `Alternative Request`. At runtime, the agent queries the inventory and dynamically routes the execution path based on stock levels.

### Pattern B: Dynamic Tool Selection (ReAct Pattern)
For free-form interactive conversations where a pre-defined path is impossible (such as Dr. Smith asking the assistant questions about past files, calendar blocks, or schedules), we use a ReAct loop.
* The graph structure of the ReAct agent is static: `LLM` $\rightarrow$ `Call Tool` $\rightarrow$ `LLM`.
* The **decision of what tools to call** and **in what sequence** is resolved dynamically by the LLM on-the-fly depending on user inputs.

### Why the Structure Should Remain Static
* **Safety and Compliance (Determinism)**: Clinical workflows (such as prescription verification or scheduling) require strict guardrails. For example, if a drug is out of stock, the system must trigger a doctor notification and pause for human approval. A static graph guarantees this rule is always enforced and cannot be bypassed or ignored by an LLM hallucination.
* **Predictable Testing**: With a static structure, you can write unit tests to verify that every path (e.g., checking in, booking, routing) works correctly. If the graph structure itself changed at runtime, it would be extremely difficult to guarantee that the agent wouldn't get stuck in infinite routing loops.