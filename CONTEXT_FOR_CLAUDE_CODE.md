# Context for Claude Code — THE HIVE (Build Day, Opus 4.8)

You are the **builder agent** for THE HIVE at the Claude Build Day (San Francisco, June 13, 2026),
running on **Claude Opus 4.8** in **Claude Code**. Read this file first, then `BRIEF.md`,
`RUBRIC.md`, and `ORCHESTRATION.md`. Those are the source of truth; this file tells you how to
operate, what the judges reward, and the visual bar.

## One line
THE HIVE is a live governance layer for swarms of AI agents. Agents do real work; a **Warden**
(an independent verifier) authorizes, denies, or escalates every action against written policy,
and writes an immutable, regulator-readable audit trail. When an agent tries to break policy,
the Warden catches it live. The whole thing is visualized as a living hive.

## What the judges reward (optimize for these — equal weight in finals)
- **Impact 35%** — agent governance for high-stakes, regulated operations. Real problem: autonomous
  agents can't be deployed in serious settings because no one can prove they stayed within bounds.
- **Demo 35%** — must work live and look stunning. Headline moments: (1) the living hive of agents
  working in real time; (2) Opus 4.8 vision reading a messy real document live; (3) a **rogue agent**
  trying to break policy and the Warden catching it in real time, in red, on screen.
- **Opus 4.8 Use 15%** — go beyond basic integration: (a) vision on a real document; (b) an
  independent adversarial verifier sub-agent (fresh context) — not self-critique.
- **Orchestration 15%** — judged from BRIEF + RUBRIC + workflow scripts. "Done" must be
  machine-verifiable: test suite, responding URL, rubric file the verifier grades against.

## Domain (concrete example under the architecture)
Use **regulated financial operations** as the live domain: a swarm of collections/servicing agents
working a synthetic loan portfolio. This makes governance tangible (money, real consequences,
a regulator who would read the log). The governance layer is the star; finance is the setting.
The architecture must stay domain-agnostic (see the Guard seam) so the same Warden could govern
agents in any domain.

## Visuals — this must look like an experience, not a dashboard
**Goal:** a living hive. The judges should feel it in the first 10 seconds.
- **Primary recommendation: a 2D/2.5D animated hive built with PixiJS** (WebGL, very high
  visual payoff for low effort, robust to build in a day). Agents = bees that travel from the hive
  to pick up tasks and return; the Warden = the comb every bee must pass through; policy decisions
  animate as color (green allow, amber escalate, red deny). This is the safest high-impact choice.
- **Alternative if you're confident: React Three Fiber** (Three.js + @react-three/drei +
  @react-three/postprocessing for bloom/glow) for a true 3D hive. Higher ceiling, higher risk.
  Only choose this if the 3D scene is solid by mid-afternoon; otherwise fall back to PixiJS.
- **Real-time updates:** server-sent events (SSE) from backend → UI paints each action as it happens.
- **Motion:** Framer Motion for transitions (the red flash when the Warden catches the rogue agent).
- **CRITICAL ANTI-DISQUALIFICATION RULE:** the system must *do* real work (ingest, decide, block,
  log), not just display metrics. If you removed the visualization, the governance engine must still
  run end-to-end. Build the engine first; the hive visualization is the skin on top. A pure
  metrics dashboard as the centerpiece is disqualified.

## Use Anthropic's best current tooling
1. **Dynamic workflows in Claude Code** — move the build/verify loop into a JS dynamic workflow
   script that orchestrates subagents in the background while your main context stays clean. Save
   the script as an artifact for judges.
2. **`/goal`** — set the target (below) and hill-climb against it autonomously.
3. **Verifier sub-agent over self-critique** — grade in an independent context window against RUBRIC.md.
4. **Subagents** for parallel work (data gen, tests, frontend) where it genuinely helps.
5. **File-based memory (`NOTES.md`)** — failures → root causes → distilled rules; consult before repeating.

## Build order (engine first, beauty second; write tests with each)
1. Synthetic data: a swarm task set + a financial portfolio (~5,000 synthetic loans).
2. **The Warden: Guard interface + policy engine** reading `policies/policies.yaml` (the heart).
   `guard.authorize(action, context) -> {allow | deny | escalate}`, pluggable backend.
3. Agent runtime: a swarm of worker agents taking actions, each routed through the Warden.
4. Human approval inbox for sensitive actions; append-only audit log + regulator-readable export.
5. Vision path: upload a real document (receipt/statement) → extract → reconcile → governed post.
6. The rogue-agent scenario: a worker that attempts out-of-policy actions; Warden catches each live.
7. **The hive visualization** (PixiJS or R3F) wired to live events via SSE.
8. Deploy to a live URL; seed on boot. Kill-switch that halts all agent actions.
9. Adversarial verifier passes all RUBRIC.md rules twice consecutively; finalize README + DEMO.md.

## Definition of done
All RUBRIC.md rules PASS per the independent verifier (twice consecutively) + test suite green +
DEMO.md runs clean on the deployed URL + the hive renders live actions. Never stop while a FAIL exists.

## Working style
Ask ALL clarifying questions now, in one batch (your only kickoff). Then plan, then run autonomously.
Diagnose and fix your own failures — that's the verifier's job to catch, not the human's. Keep the
repo clean and readable: Anthropic engineers will read this code. Synthetic data only; nothing real.
