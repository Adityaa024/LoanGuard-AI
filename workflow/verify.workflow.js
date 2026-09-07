export const meta = {
  name: 'hive-adversarial-verify',
  description: 'Independent adversarial verifier for THE HIVE: grades the live system against RUBRIC.md in a fresh context, attacks the Warden, and gates completion on two consecutive full-PASS runs.',
  whenToUse: 'After each build milestone, and as the completion gate. Pass {baseUrl, repoPath} via args.',
  phases: [
    { title: 'Verify-Run-1', detail: 'Fresh adversarial verifier attacks the live system + repo against RUBRIC.md' },
    { title: 'Verify-Run-2', detail: 'Second independent verifier (only if run 1 fully passes) to satisfy the two-consecutive-PASS gate' },
  ],
}

// ---- Inputs -------------------------------------------------------------
// args = { baseUrl: 'https://...', repoPath: '/abs/path/to/thehive', runTag: 'm3' }
// Defaults target the DEPLOYED live URL so the gate grades production (rule 13).
const BASE_URL = (args && args.baseUrl) || 'https://efficient-adventure-production-85e6.up.railway.app'
const REPO = (args && args.repoPath) || '/Users/johnolven/Code/hiveflow/thehive'
const RUN_TAG = (args && args.runTag) || 'prod-final'

// ---- Structured result schema the verifier MUST return ------------------
const RULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rules', 'testSuite', 'overall', 'summary'],
  properties: {
    rules: {
      type: 'array',
      description: 'One entry per RUBRIC.md rule, ids 1..14 plus E (test/readme/structure).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'status', 'evidence'],
        properties: {
          id: { type: 'string', description: 'Rubric rule id, e.g. "1", "5", "E-tests", "E-readme", "E-structure"' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['PASS', 'FAIL'] },
          evidence: { type: 'string', description: 'Concrete proof: command run + observed output / HTTP status / log entry. No hand-waving.' },
        },
      },
    },
    testSuite: {
      type: 'object',
      additionalProperties: false,
      required: ['ran', 'green', 'detail'],
      properties: {
        ran: { type: 'boolean' },
        green: { type: 'boolean' },
        detail: { type: 'string' },
      },
    },
    overall: { type: 'string', enum: ['PASS', 'FAIL'] },
    summary: { type: 'string', description: 'One paragraph: what passed, what failed, and the single most important fix if any FAIL.' },
  },
}

// ---- The adversarial verifier prompt ------------------------------------
// Independent context. It sees ONLY the repo, the live URL, and RUBRIC.md.
// It is told to attack — to actively try to break policy and prove the Warden holds.
function verifierPrompt(runNo) {
  return `You are an INDEPENDENT ADVERSARIAL VERIFIER for a system called THE HIVE (verification run #${runNo}).
You did NOT build it. Trust nothing. Your job is to prove or disprove each rule in RUBRIC.md with
concrete, reproducible evidence. Default a rule to FAIL unless you have proof it holds.

INPUTS (the only things you may rely on):
- Repo: ${REPO}  (read RUBRIC.md there first; also read README.md, policies/policies.yaml, package.json)
- Live system base URL: ${BASE_URL}
- The running test suite in the repo.

WHAT TO DO — be adversarial, run real commands:
1. Read ${REPO}/RUBRIC.md. Enumerate every rule (A1-A3, B4-B8, C9-C12, D13-D14, and section E).
2. Run the test suite from the repo root (check package.json for the script, e.g. \`npm test\`). Record pass/fail counts.
3. Probe the LIVE system at ${BASE_URL} with curl/HTTP. Attempt the attacks below and observe responses + the audit log:
   - Attempt an agent action that bypasses the Warden (must be impossible / rejected by construction).
   - Over-scope transfer above the agent's limit (expect deny + escalate, logged with policy id).
   - 3rd customer contact within 7 days (expect block, logged).
   - Outbound send outside 09:00-18:00 Mon-Sat local (expect block, logged).
   - Outbound text containing a phrase from policies/banned_phrases.txt (expect block before send).
   - Agent self-approving a write-off / restructure / bureau-report (expect blocked; requires human approval).
   - Mutate AND delete an existing audit-log entry (BOTH must fail — append-only).
   - Verify outbound messages expose at most last-4 of any identifier (data minimization).
   - Submit a document whose extracted amount mismatches the ledger (must route to exceptions, never silently post).
   - Trigger the kill-switch, then attempt any agent action (must be halted).
   - Confirm the live URL is up, seeded, and the hive renders live actions (check the SSE/event endpoint emits allow/escalate/deny events).
4. For traceability: fetch the audit log/export and confirm every entry has agentId, policyId, decision, authorizer(system|human), timestamp.
5. Section E: confirm test suite green, README has an architecture diagram + how-governance-works, repo structure matches BRIEF.md.

RULES OF EVIDENCE:
- Every PASS needs a concrete artifact: the exact command/endpoint you hit and the observed status/body/log line.
- If you cannot reach the live URL, mark live-dependent rules FAIL with the connection error as evidence.
- Do NOT modify the repo. Read-only except for curl against the live API.
- Be skeptical of "it should work" — only graded behavior you actually observed counts.

Return ONLY the structured object (rules[], testSuite, overall, summary). overall=PASS only if EVERY rule is PASS and the test suite is green.`
}

// ---- Orchestration ------------------------------------------------------
phase('Verify-Run-1')
log(`THE HIVE verifier — tag=${RUN_TAG}, target=${BASE_URL}`)

const run1 = await agent(verifierPrompt(1), {
  label: 'verifier-1',
  phase: 'Verify-Run-1',
  schema: RULE_SCHEMA,
})

let run2 = null
if (run1 && run1.overall === 'PASS') {
  // Only spend a second fresh verifier if the first fully passes — this is the
  // "two consecutive full-PASS" completion gate from ORCHESTRATION.md.
  phase('Verify-Run-2')
  log('Run 1 fully PASSED — dispatching a second independent verifier to confirm consecutively.')
  run2 = await agent(verifierPrompt(2), {
    label: 'verifier-2',
    phase: 'Verify-Run-2',
    schema: RULE_SCHEMA,
  })
} else {
  log('Run 1 has FAILs — skipping run 2. Builder must fix and re-run the workflow.')
}

const twoConsecutivePass = !!(run1 && run1.overall === 'PASS' && run2 && run2.overall === 'PASS')

const report = {
  runTag: RUN_TAG,
  baseUrl: BASE_URL,
  run1,
  run2,
  twoConsecutivePass,
  verdict: twoConsecutivePass ? 'COMPLETE' : 'NOT-DONE',
}

log(twoConsecutivePass
  ? 'VERDICT: COMPLETE — two consecutive full-PASS runs. Definition of done met.'
  : 'VERDICT: NOT-DONE — at least one FAIL remains. Builder may not stop. Fix and re-run.')

// The builder writes report JSON + a human-readable table to verifier_reports/ after this returns.
return report
