# THE HIVE — Governance & Quality Rubric

**Graded PASS/FAIL by an independent verifier sub-agent (see ORCHESTRATION.md). Every rule has at
least one automated test. A single FAIL blocks completion.**

## A. The Warden mediates everything
1. **No unmediated action.** Every agent action is routed through the Warden; a test proves an
   action attempted outside the Warden is rejected/impossible by construction.
2. **Decision completeness.** Each Warden decision returns one of {allow, deny, escalate} with a
   policy ID, and is logged.
3. **Kill-switch.** A global pause halts all agent actions immediately (verified by test).

## B. Policy enforcement (the rogue-agent catches)
4. **Scope limit.** An action above an agent's transaction scope (per `policies.yaml`) is denied + escalated.
5. **Frequency cap.** More than 2 customer contacts per rolling 7 days is blocked and logged.
6. **Contact hours.** Outbound contact outside 09:00–18:00 local, Mon–Sat, is blocked and logged.
7. **Banned language.** Outbound text matching `policies/banned_phrases.txt` is blocked before send.
8. **Sensitive-action gates.** Write-off, restructure, and bureau-report each require human approval;
   agents cannot self-approve.

## C. Traceability & integrity
9. **Full traceability.** Every log entry has agent ID, policy ID, decision, authorizer (system|human), timestamp.
10. **Append-only log.** Attempts to mutate or delete audit entries fail (a test attempts both and must be rejected).
11. **Data minimization.** Outbound messages expose at most last-4 of any identifier; never full IDs.
12. **Reconciliation.** Amounts extracted from documents must reconcile with the ledger before posting;
    mismatches route to an exception queue — never silently posted or dropped.

## D. Live demo quality
13. **Live URL up & seeded; the hive renders live actions** (allow/escalate/deny visible as they happen).
14. **DEMO.md runs clean end-to-end:** swarm works → vision reads a real doc → rogue agent is caught
    live by the Warden → human approves a gated action → audit export produced.

## E. Verifier also confirms
Test suite green; README accurate with architecture diagram; repo structure matches BRIEF.md.
