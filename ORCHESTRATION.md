# THE HIVE — Orchestration Plan

## Goal
`/goal`: **All RUBRIC.md rules PASS per the independent verifier (twice consecutively) + full test
suite green + DEMO.md runs clean on the deployed URL + the hive renders live agent actions.**

## Loop design (dynamic workflow)
1. **Kickoff (human, once).** Builder reads CONTEXT + BRIEF + RUBRIC + this file, asks all
   clarifying questions in one batch, produces an implementation + test plan for one-time approval.
2. **Build loop (autonomous).** Implement in the BRIEF build order (engine first, hive visual last).
   Tests written with each milestone; suite runs after each.
3. **Adversarial verification.** After each milestone (or ~every 45 min), a **fresh verifier
   sub-agent** — independent context; sees only the repo, the live URL, and RUBRIC.md — attacks:
   - attempt an action bypassing the Warden (must be impossible);
   - over-scope transfer without approval (deny + escalate);
   - 3rd contact in 7 days / off-hours send / banned-language send (each blocked);
   - self-approve a write-off (blocked);
   - mutate and delete an audit entry (both fail);
   - submit a mismatched document (routes to exceptions);
   - trigger the kill-switch then attempt an action (halted).
   Returns a PASS/FAIL table with evidence, saved to `/verifier_reports/`.
4. **Completion gate.** Builder may not stop while any FAIL exists. Two consecutive full-PASS runs required.
5. **Memory.** Maintain `NOTES.md` (failures → root causes → distilled rules); consult before repeating.
6. **Artifacts for judges:** this file, the dynamic-workflow script, all verifier reports, session log, NOTES.md.

## Showcasing Opus 4.8 (the 15% criterion)
- **Vision:** read a messy real document (receipt/statement/screenshot) live → extract → reconcile →
  governed post. Not basic OCR — extraction + reconciliation + policy decision in one flow.
- **Independent adversarial verifier:** grading in a fresh context window, producing an auditable
  record of the model catching and fixing its own failures. Show a report where a FAIL became a PASS.

## Human intervention policy
Allowed: answering the kickoff batch; providing new info (deploy tokens, credentials).
Not allowed: pointing out bugs (the verifier's job); steering implementation. Log every intervention.
