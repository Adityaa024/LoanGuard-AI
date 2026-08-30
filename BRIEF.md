# THE HIVE — Builder Brief

**THE HIVE**: a live governance layer for swarms of autonomous AI agents. Agents do real work; an
independent **Warden** authorizes, denies, or escalates every action against written policy, and
records an immutable, regulator-readable audit trail. When an agent tries to break the rules, the
Warden catches it — live. Built end-to-end today and deployed to a live URL.

Built at the Claude Build Day (San Francisco, June 13, 2026), on Claude Opus 4.8.

## The problem & who it's for
Autonomous agents are capable enough to run real operations — moving money, contacting customers,
touching critical systems. They are not *deployed* in serious, regulated settings for one reason:
no one can prove an agent stayed within its authority. When an agent acts, **who answers for it?**
THE HIVE answers that: every agent action passes through a governance layer with written policies,
human approval gates, and an audit trail an auditor could read. Agents become deployable because
they become accountable.

**Users:** teams deploying agent swarms in regulated or high-stakes operations (financial services
is the live example here). **Quality bar:** every decision and log entry should look credible to a
real compliance officer or auditor.

## Live domain (the concrete setting)
A swarm of collections/servicing agents works a synthetic loan portfolio: scoring risk, drafting
borrower outreach (simulated outbox — no real messaging), handling payments. This makes governance
tangible. The governance layer is the product; finance is the setting. Architecture stays
domain-agnostic so the same Warden could govern agents in any domain.

## What DONE looks like (all verifiable without a human)
1. **Live URL** runs the full flow, seeded on boot, with the hive visualization rendering live.
2. **Synthetic data:** a worker-agent task set + ~5,000 synthetic loans (`data/` generator + files).
   No real names, institutions, or identifiers.
3. **The Warden:** every agent action is routed through `guard.authorize(action, context)` →
   {allow | deny | escalate}. No code path acts without it.
4. **Policy engine:** policies live in `policies/policies.yaml` (scopes, limits, hours, frequency).
5. **Human approval inbox:** sensitive actions (write-off, restructure, bureau report, over-scope)
   halt and wait for one-click human approval; decision is logged with the approver.
6. **Vision path:** upload a real document (receipt/statement/screenshot) → Opus 4.8 extracts
   amounts/dates/refs → reconcile against the ledger → governed post, or route to exceptions.
7. **Rogue-agent scenario:** a worker attempts out-of-policy actions (off-hours contact, banned
   language, over-scope transfer, log tampering). The Warden denies each, flags it live, escalates,
   and logs it.
8. **Audit log:** append-only; each entry records agent ID, policy ID, decision, authorizer
   (system|human), timestamp; exportable as a regulator-readable report.
9. **Kill-switch:** a global control halts all agent actions immediately.
10. **All RUBRIC.md rules PASS** per the independent verifier; test suite green; accurate README
    (with architecture diagram + how governance works) and a DEMO.md script for the live walkthrough.

## Architecture constraints (non-negotiable)
- **The Guard/Warden seam.** All governance flows through one interface with a pluggable backend
  (today: local policy engine reading `policies/policies.yaml`). Design it so an external governance
  API could replace the backend without touching agent code. Keep it domain-agnostic.
- **Engine before beauty.** The governance engine must run end-to-end even with the visualization
  removed. The hive visual is the skin, not the substance. A metrics dashboard as the centerpiece
  is disqualified by event rules — THE HIVE must *do* work, visibly.
- **Visualization:** a living hive (PixiJS recommended; React Three Fiber if 3D is solid by
  mid-afternoon). Agents as bees, the Warden as the comb they pass through, decisions as color.
  Live updates via SSE; transitions via Framer Motion.
- **Synthetic data only.** **Stack:** your choice; prefer fast and deployable (React + Vite +
  Tailwind frontend; FastAPI or Node backend; SQLite/Postgres). Deploy to Vercel + Railway. Seed on boot.
- **License:** Apache 2.0 (already in repo).

## How to work
Ask all clarifying questions at kickoff in one batch. Then plan, write tests alongside features,
check your own work, and fix your own failures. Keep `NOTES.md`. Done only when the verifier passes
twice consecutively and DEMO.md runs clean on the live URL.
