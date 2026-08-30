# Verifier Report — run `local-m1`

**Target:** `http://localhost:8080` (pre-deploy validation run)
**Verdict:** `COMPLETE` — **two consecutive full-PASS runs** (`twoConsecutivePass: true`)
**Score:** 34/34 PASS across both independent fresh-context runs · **0 FAIL**

Two independent adversarial verifier sub-agents (no build context; saw only the repo, the live URL,
and `RUBRIC.md`) attacked the running system and graded every rule. Both returned `overall: PASS`.

| Rule | Title | Result |
|------|-------|:------:|
| 1 | No unmediated action (structural) | PASS |
| 2 | Decision completeness | PASS |
| 3 | Kill-switch halts everything | PASS |
| 4 | Scope limit → deny + escalate | PASS |
| 5 | Frequency cap (>2/7d) | PASS |
| 6 | Contact hours | PASS |
| 7 | Banned language (pre-send) | PASS |
| 8 | Sensitive-action gates (no self-approval) | PASS |
| 9 | Full traceability | PASS |
| 10 | Append-only log (mutate+delete rejected) | PASS |
| 11 | Data minimization (last-4) | PASS |
| 12 | Reconciliation → exceptions | PASS |
| 13 | Live URL up, seeded, hive renders live | PASS |
| 14 | DEMO.md runs clean end-to-end | PASS |
| E-tests | Test suite green (26/26) | PASS |
| E-readme | README accurate + architecture diagram | PASS |
| E-structure | Repo structure matches BRIEF | PASS |

**Attacks performed live (both runs):** Warden-bypass attempt (impossible by construction),
over-scope transfer (deny+escalate), off-hours + banned-language sends (blocked), self-approved
write-off (escalate, not auto-applied), audit mutate AND delete (both rejected; hash chain verified),
mismatched document (routed to exceptions, not posted), kill-switch engage→halt→reset.

Raw structured output: [`run-local-m1.raw.json`](run-local-m1.raw.json).

> This run validated the system on localhost. The final completion gate re-runs the same workflow
> against the **deployed Railway URL** (rule 13's "live URL") once deploy auth is in place.
