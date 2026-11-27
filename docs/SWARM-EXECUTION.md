# Swarm Agents — Explanation & Execution Plan

## 1. What a Swarm Agent Is

A **swarm** is a multi-agent AI topology where autonomous peer agents hand work directly to each other (no central router), each with its own context window, instructions, and tools. The term entered engineering practice via OpenAI's experimental **Swarm** framework (Oct 2024), whose production successor is the **OpenAI Agents SDK** ("handoffs-as-tools": a function returning an agent transfers the conversation to it).

The competing topology is **orchestrator-worker**: a lead agent decomposes the task, delegates to subagents in parallel, and synthesizes results (Anthropic's multi-agent Research system, Jun 2025).

### The evidence (2025–2026)

| Finding | Source | Implication |
|---|---|---|
| Orchestrator-worker beat a single top-tier agent by **+90.2%** on research evals | Anthropic, Jun 2025 | Multi-agent wins on broad, read-heavy, parallelizable work |
| But cost **~15× the tokens**; token spend explained ~80% of quality variance | Anthropic, Jun 2025 | Fan-out is expensive; width of 3–5 subagents is the sweet spot |
| **"Don't Build Multi-Agents"**: agents making *conflicting implicit decisions* on shared mutable state produce incoherent results | Cognition, Jun 2025 | Multi-agent is wrong for tightly-coupled code writes |
| Practitioner consensus: start centralized (orchestrator-worker); go swarm only with measured evidence | industry field guides, 2025–2026 | Topology follows task shape: **read vs. write** |

### The synthesis rule we adopt

> **Parallelize reading. Serialize writing. Verify independently.**

- **Read-heavy tasks** (research, design exploration, code review, test generation) decompose cleanly — fan out.
- **Write tasks on shared state** (one codebase, one scene graph, one store) carry implicit decisions — a single coherent context must own them.
- **Verification** is read-only and independent — perfect for a second agent with fresh eyes.

## 2. How We Execute With This Model

The senior developer (me) acts as the **orchestrator**. Role agents are invoked per milestone; the human gates every merge.

### Roles

| Role | Topology | Owns | Hands off |
|---|---|---|---|
| **Orchestrator** (senior dev) | — | Task decomposition, scope, sequencing, final synthesis | Delegation prompts with explicit boundaries |
| **Researcher** (fan-out, 3–5 in parallel) | read-only | Stack verification, ethnographic detail, API research | Findings with sources → docs |
| **Implementer** | single context | One milestone's code, per `TASKS.md` scope | Diff + self-check → Verifier |
| **Verifier** | read-only | `tsc`, `vitest`, `playwright` runs | Pass/fail + evidence → Orchestrator |
| **Vision Reviewer** | read-only | Golden screenshots vs. acceptance criteria | AC-by-AC verdict → Orchestrator |
| **Adversarial Reviewer** | read-only | Security, slop check, scope creep, rule violations (`AGENTS.md`) | Findings → Orchestrator |

### Execution protocol per milestone

1. **Plan** — Orchestrator restates scope from `TASKS.md`; Researcher fans out only if new unknowns surfaced.
2. **Implement** — one Implementer context owns the whole milestone (no mid-milestone context switching; conflicting implicit decisions live here).
3. **Verify (parallel fan-out)** — Verifier (tooling) and Adversarial Reviewer (rules/security) run concurrently on the same diff.
4. **Golden gate** — Vision Reviewer checks every screenshot against the AC list in `TASKS.md`; a passing DOM assertion with a wrong-looking render is a failure.
5. **Human gate** — Orchestrator synthesizes all three reports; the user approves merge. No agent merges alone.

### Delegation discipline (learned from Anthropic's failure modes)

- Delegation prompts state **explicit objectives, explicit boundaries, and explicit exclusions** ("don't touch `pricing.js`, that's M3 scope") — duplicated work and scope bleed come from vague delegation, not weak models.
- Verification agents get **no access to the Implementer's reasoning** — fresh-eyes review catches what shared context normalizes.
- Anti-echo guard: one-paragraph system rule for any multi-agent chain — reviewers must report *disagreements with prior agents*, not harmonize.

## 3. Honest Limits

- Token cost: fan-out verification is 3–5× a single review — justified here because the failure modes (silent visual wrongness, oversell bugs, slop) are exactly the ones humans miss in generated code.
- A swarm cannot rescue a bad spec: the governance docs in this PR are the upstream quality control.
- For this project's size, orchestrator-worker + verification subagents is the ceiling; a peer-to-peer swarm would add coordination cost with no read/write win.
