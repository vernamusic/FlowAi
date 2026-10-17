# ⚡ FlowAI — AI Workflow Builder

> Build, run, and debug AI workflows entirely in your browser.

**FlowAI** is a **frontend-only** workflow builder built with **Next.js, TypeScript, Tailwind CSS, Zustand, and React Flow**. Connect nodes, wire variables between them, run the graph, and watch every step stream in — no server, no account, no database.

---

## 🌐 Language

- 🇬🇧 [English](README.md)
- 🇮🇷 [فارسی](README.fa.md)

---

# ⚠️ Read this first: what FlowAI is and is not

FlowAI is a **local-first, bring-your-own-key app**. Understanding its limits is the difference between using it well and being surprised by it.

### It runs entirely in your browser

There is **no backend**. Everything — the editor, the workflow engine, storage, and every request FlowAI makes — happens in the tab you have open.

| Concern | Reality |
| --- | --- |
| **Where workflows live** | `localStorage`, per browser, per device. Clearing site data deletes them. |
| **Who can open them** | Only you, on this browser. There is no sharing, sync, or account. |
| **What a "run" means** | The current page executes the graph in JavaScript. Closing the tab stops it. |
| **Scheduling** | None. A workflow runs when you press Run, or from the page-load / interval trigger while the tab stays open. |
| **Webhooks** | Simulated. The Webhook Trigger node replays a payload you paste; nothing listens on a public URL. |
| **Cost** | Whatever your AI provider charges you, billed to your key. FlowAI never proxies it. |
| **Network** | Only the requests your nodes make, and only to the hosts you configure. |

### Bring your own key (BYOK)

AI nodes call your provider directly from the browser with **your** key.

- Keys live in **`sessionStorage` only**. They are never written into a workflow, never exported, and never sent anywhere except the provider you chose.
- Closing the tab forgets the key. There is no "remember me" on purpose: anything persisted to `localStorage` is readable by any script running on your origin.
- **Token estimates and costs are estimates.** They use published list prices and a local token count. Real usage is reported by the provider in the execution log when it supports it.
- Because requests come from your browser, a provider that blocks browser origins (CORS) or requires a server-side secret will not work. `responses_format` style APIs that need a backend are out of scope for this design.

### Private browsing

Local storage is unavailable or wiped in some private modes. FlowAI keeps working, but workflows do not survive a reload — export them.

---

# ✨ Features

### 🎨 Visual Workflow Builder

- Drag a node from the library, **click it** to drop it in the middle of the view, or add one from the command palette
- Connect nodes by dragging between handles, and delete a connection by clicking it and pressing Delete
- True / False branches on conditions, **Body / After** branches on loops
- Undo / redo, duplicate, delete, mini-map, zoom and pan
- Snap to grid, and hold **Space** to pan from anywhere, including over a node
- A command palette (**Ctrl/⌘ + K**) for finding a workflow, adding a node, or running an action
- Full keyboard control, with a built-in shortcut reference (`?`)

### 📊 Executions and what they cost

- Every run is kept in the browser, the **last 20**
- `/executions` lists them, with status, duration, tokens and cost
- A run's own page shows its logs, each node's input and output, and what each AI node spent
- Tokens and cost per workflow, and per day for the last 14 days
- Costs are marked with `*` when they were counted locally rather than reported by the provider, and a total that mixes priced and unpriced runs says so rather than pretending the rest was free

### 🛡 When a node fails

Every node except a trigger has three settings:

- **Retry** — 1 to 5 extra attempts, with a wait between them. A flaky API gets a second chance instead of failing the run
- **Timeout** — a deadline for one attempt, so a call that hangs fails the node rather than the whole session
- **Continue on error** — the run carries on down the rest of the graph. The node still shows as failed, and the error is passed downstream as `error`

### 🧩 Sixteen node types

| Category | Nodes |
| --- | --- |
| Triggers | Manual Trigger, Webhook Trigger (simulated), Page Load Trigger, Interval Trigger |
| AI | AI Prompt |
| Logic | Condition, Switch, Merge, Math, Text, Set Variable, JSON Parser, Loop |
| Actions | HTTP Request, Delay, Output |

**Math** takes an arithmetic expression — `+ - * / % ^`, parentheses, and
`abs ceil floor max min pow round sqrt` — and never evaluates it as code.
**Switch** routes to the first case that matches, with a default branch.
**Merge** joins several branches back into one value.

### ⏱ Triggers that run themselves

Page Load and Interval triggers start the workflow without anyone pressing
Run. Both only fire **while the editor is open**: FlowAI has no server to
run them on, so a closed tab means no runs. Interval runs default to a dry
run, because a timer that repeats forever should not quietly spend money.

### 🤖 AI that actually streams

- Any **OpenAI-compatible** provider: OpenAI, Ollama, or your own endpoint
- **Streaming** output, rendered while the model writes
- Response formats: **text**, **JSON**, or **structured output** constrained by a JSON schema
- A **test run** in the inspector so you can iterate without running the whole graph
- Token and cost estimates before you run, real usage after
- Prompt templates, reusable system instructions, and schema presets

### 🔗 Variables that tell you the truth

- A node can only read variables from nodes **actually connected above it**
- `{{node.items[0].title}}` array indexing, `{{node.meta["order-id"]}}` bracket keys, `{{node.customer?.email}}` optional chaining, `{{node.total ?? "n/a"}}` fallbacks
- The **Variables panel** lists every value in the workflow, with what it resolved to after the last run
- Broken references are reported **before** the run, with the node that needs fixing

### ⚙️ Execution engine

- Topological execution with dependency ordering
- Branching, skipping, and failure isolation
- Loops that repeat a subtree per item, with per-iteration logs
- Cancellation that stops a run immediately, including mid-delay
- Dry runs that never touch the network
- Execution history (last 20 runs) with copyable input/output

### 🧪 Testable

- **159 unit and component tests** (Vitest)
- **32 browser tests** (Playwright) covering create, save, import, export, reset, and corrupted storage
- Run everything with `npm run test:all`

---

# 🏗️ Architecture

```text
                    ┌────────────────────┐
                    │   Workflow Editor  │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌──────────────┐
       │ Node       │  │ Canvas     │  │ Inspector    │
       │ Library    │  │            │  │ + Variables  │
       └─────┬──────┘  └─────┬──────┘  └──────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │   Zustand Store  │
                    └─────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────────┐   ┌────────────────┐
│ Variable      │   │ Execution Engine  │   │ Storage        │
│ system        │   │ + node handlers   │   │ (localStorage) │
└───────────────┘   └─────────┬─────────┘   └────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌────────────────┐
            │ Execution UI  │   │ AI providers   │
            │ + logs        │   │ (BYOK, direct) │
            └───────────────┘   └────────────────┘
```

### The variable system

```text
variable-parser     {{...}} → key, path segments, fallback
        │
        ▼
variable-scope      which variables this node may read (graph walk)
        │
        ▼
variable-resolver   resolve a value against the runtime context
        │
        ▼
variable-audit      report what will break, before the run
```

### Adding a node type

1. Add the type to `NodeType` in `src/types/workflow.ts`
2. Describe it in `src/constants/nodes.ts`
3. Implement `read*Config` + `execute*` in `src/lib/workflow/execution/nodes/`
4. Declare its outputs in `getNodeOutputFields` (`variable-scope.ts`)
5. Add config validation in `validation.ts`
6. Build an inspector and register it in `workflow-inspector.tsx`
7. Add tests

---

# 🔒 Privacy

- Workflows and execution history: `localStorage`
- AI provider keys: `sessionStorage`, per provider
- Nothing is sent to any FlowAI service, because none exists
- Requests leave your browser only when a node executes and calls a host you configured

---

# 🔌 Requirements

- Node.js 20+
- A modern browser
- An API key from an OpenAI-compatible provider, if you use AI nodes

---

# 🖥️ Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run the browser tests once:

```bash
npx playwright install chromium
```

---

# 🧭 Roadmap

Honest list of what is **not** here yet:

- Real webhook endpoints (needs a server)
- Scheduled runs (needs a server, or a tab you keep open)
- Accounts, sharing, or sync (needs a backend)
- Long-running or retry-heavy background jobs

---

# 📌 Status

**Status:** feature complete for a local-first, browser-only tool. Stable, tested, and intentionally without a backend.

---

# 👨‍💻 Author

Built with ❤️ using modern frontend technologies.

---