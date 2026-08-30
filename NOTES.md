# NOTES.md — THE HIVE build journal

File-based memory: failures → root causes → distilled rules. Consult before repeating a mistake.

## Decisions (kickoff)
- Backend: **Node + Express** (SSE for live events). Frontend: **React + Vite + Tailwind**, hive in **PixiJS**.
- Deploy: **single Railway service** serving built frontend + API + SSE → one live URL.
- Agent brains: **hybrid** — deterministic simulation fills the swarm; **Opus 4.8** powers showcase
  moments (vision extraction, rogue-agent reasoning, the independent verifier).
- Vision doc: **synthetic-but-realistic seeded doc + accept runtime uploads** (judge can try their own).
- Secrets: `ANTHROPIC_API_KEY` (+ deploy token) provided via `.env`. Synthetic data only.
- `banned_phrases.txt` is Spanish (MX collections). Canonical copy lives at `policies/banned_phrases.txt`.

## Open risks
- Railway SSE timeouts / buffering — verify keep-alive works on the deployed URL, not just local.
- Opus vision latency in a live demo — cache last extraction; never block the hive on an LLM call.
- Append-only log integrity must be enforced server-side (hash chain), not just by convention.

## Blockers (need human-provided info — allowed intervention)
- **Railway deploy auth** (since 11:54): CLI is `Unauthorized`, no `RAILWAY_TOKEN`. Thin skeleton +
  `railway.json` + `scripts/deploy.sh` are ready. Unblock via `railway login` OR `RAILWAY_TOKEN` in `.env`.
  Engine build continues in parallel; deploy fires the moment auth lands.

## Progress (as of first verifier run)
- Engine complete: Warden + policy engine, orchestrator (sole executor), append-only hash-chained
  audit, approval inbox, exceptions, kill-switch. 26/26 tests green.
- Opus 4.8 vision verified LIVE: reads the stained synthetic statement, extracts amount/ref/last-4,
  reconciles via the Warden → match posts, mismatch → exceptions. Confidence ~0.98.
- Rogue scenario: all 5 attempts contained (HOURS/LANG/SCOPE deny, GATE escalate, INTEGRITY tamper
  rejected). Opus writes a clean compliance summary over the real timeline.
- PixiJS hive builds + mounts with zero console errors; SSE-wired. Final visual check on live URL.
- README (with arch diagram) + DEMO.md written.

## Failures → root causes → rules
- **Test runner**: `node --test test/` treats the dir as a script → use glob `'test/**/*.test.js'`.
  Rule: always pass a glob to node --test.
- **Rogue self-approval** first showed POL-SCOPE (rogue scope 0 denies before the gate). Root cause:
  deny is more severe than escalate, so scope wins. Fix: route the self-approval attempt through an
  impersonated privileged agent so it isolates POL-GATE. Rule: to demo a specific control, remove
  the more-severe violations from the test action.
- **Opus refused** the "sinister roleplay" narration (good safety behavior, bad optics). Fix: ask for
  a data-grounded compliance summary instead. Rule: never ask the model to role-play abuse; frame
  showcase reasoning as analysis over real artifacts.
- **Headless screenshot** of the WebGL hive hangs (`--virtual-time-budget` never idles with a
  continuous ticker). Rule: verify canvas apps via DOM-dump (load event) + live URL, not virtual-time.

## Deploy status — LIVE
- Deployed to Railway (project `efficient-adventure`, workspace Hiveflow), single service serving
  web build + API + SSE. Live URL: https://efficient-adventure-production-85e6.up.railway.app
- First token was invalid; second project token (UUID) worked with `railway up --service <name>`.
  Project tokens reject `whoami`/`status` — that's expected, not an error.
- **Prod font bug (fixed)**: `sharp` re-rendered the demo statement SVGs in the container, which
  lacks fonts → all text rendered as tofu boxes → Opus extracted null → mismatched. Root cause:
  minimal container has no system fonts. Fix: commit the known-good PNGs (un-ignore the two demo
  statements) and make `generate.js` skip re-rendering when the files already exist. Rule: never
  rely on server-side text rasterization in a minimal container; ship the rendered asset.
- First verifier run (`local-m1`) against localhost: COMPLETE, 2 consecutive full PASS, 0 FAIL.
- Final verifier run (`prod-final`) against the live URL: in progress.

## Verifier gate — PASSED (done)
- `verifier_reports/run-local-m1.{md,raw.json}` — localhost, 34/34 PASS, twoConsecutivePass=true.
- `verifier_reports/run-prod-final.{md,raw.json}` — DEPLOYED URL, 34/34 PASS, 0 FAIL,
  twoConsecutivePass=true, verdict COMPLETE. Chain verified across 644 entries through all attacks.
- Note: the Workflow `args` did not propagate to the script in this runtime; fixed by hardcoding the
  deployed URL as the script default so the gate grades production. Rule: don't rely on Workflow args
  reaching the script — bake critical inputs into the script default.

## UX pass (post-gate, frontend only — engine untouched)
- Clickable live-decision detail drawer (policy/reason/agent/authorizer + matching hash-chained audit
  entry via new read-only /api/audit/entry/:seq). Onboarding intro banner + tooltips + legend.
  Mobile-responsive stacking. Rebuilt + redeployed; final verifier run is post-UX (bundle index-DCOLKY0j.js).

## DONE (core)
All RUBRIC rules PASS (independent verifier, twice) + 26/26 tests + DEMO.md clean on the live URL +
hive renders live. Live: https://efficient-adventure-production-85e6.up.railway.app

## 3D View tab (bonus, additive, isolated)
- New tab "3D View" renders the SAME live SSE decisions as a Three.js / R3F scene (bees as 3D
  spheres through a glowing Warden core; green/amber/red; bloom). New files only: web/src/Hive3D.jsx,
  web/src/ErrorBoundary.jsx. 2D Hive.jsx, the engine, and the API are UNCHANGED.
- Isolation: Hive3D is a lazy() chunk (three/R3F never load on the 2D path), mounted only when its
  tab is active, wrapped in an ErrorBoundary, and clears its apiRef on unmount. SSE handler dual-
  dispatches null-safe. A 3D failure cannot affect the 2D view, the engine, or the API.
- Verified: build clean (separate 909KB Hive3D chunk), 2D path pristine, chunk serves 200, 26/26
  tests green. Final 3D visual confirm = open localhost and click "3D View".

## Round 2 additions (NL→policy, harm counter, co-pilot)
- **#1 NL→policy compiler**: `src/policy/compiler.js` (Opus 4.8 tool-use → structured rule + offline
  mini-parser), `src/policy/author.js` (governed apply: validate → guard.authorize gate →
  engine.addRule hot-reload → audit). Engine gained `authoredRules` + `checkAuthored` (kinds:
  contact_day/amount_cap/banned_phrase/contact_hours) merged into evaluate(). Persists to
  `policies/authored.yaml` overlay (gitignored). UI: 2D-only "Author a policy" box.
- **#2 harm prevented**: `src/audit/harm.js` pure aggregator over the audit log; added `amount` to
  audit entries (guard #finalize) so $ blocked is provable from the export; `/api/state stats.prevented`;
  UI headline strip.
- **#4 co-pilot**: `src/policy/copilot.js` (Opus drafts a recommendation citing policyId + masked
  borrower); `/api/inbox/:id/recommendation` logs it; shown in the approval modal. Human still authorizes.
- Tests: 26 → 32 (compiler 3, harm 1, copilot 2). All green.

## Failures → root causes → rules (round 2)
- **Test contamination via authored.yaml overlay**: after exercising `/api/policy/apply` on the
  running server, a `policies/authored.yaml` was persisted; the next `npm test` loaded it into every
  buildSystem(), so the authored transfer-cap denied a previously-allowed transfer → 1 test failed.
  Root cause: runtime overlay leaking into hermetic tests. Fix: `npm test` runs with
  `HIVE_NO_OVERLAY=1`; the engine skips overlay load under that flag. Rule: runtime-persisted state
  must be opt-out in tests; never let a server-written file change test outcomes.

## Multi-Agent Appeals (governed negotiation) — additive, isolated
- When the Warden DENIES, `appeals-01` (scopeLimit 0, never executes) files an appeal: Opus 4.8
  drafts an argument from MASKED loan context; the Warden rules through the SAME seam
  (`guard.reviewAppeal`). Two-tier via `appealable:` in policies.yaml:
  - IMMUTABLE (scope/banned/data-min/hours/recon) → auto-reject → **UPHELD · POLICY IMMUTABLE**.
  - DISCRETIONARY (frequency/sensitive) → **OVERTURNED → routed to human inbox** (never auto-grants;
    a human still approves — RUBRIC 8 preserved).
- Audit: two new hash-chained kinds `appeal.filed` (argument) + `appeal.ruling` (verdict, written by
  the Guard). decision maps to escalate(filed/overturned)/deny(upheld) so it stays in the standard set;
  chain still verify()s. SSE: `appeal` {status: filed|upheld|overturned, argument, policyId, ...}.
- Files: `src/engine/appeals.js` (draftArgument/fileAppeal/runAppealDemo), `guard.reviewAppeal`,
  `engine.isAppealable`, `orchestrator.enqueueAppealReview`, `POST /api/demo/appeal {case|action|seq}`.
  Offline (HIVE_OFFLINE=1): canned argument per case. Engine runs end-to-end without appeals.
- Viz (additive, 2D + 3D): violet appeals-01 station + INBOX marker; `hive.appeal(evt)` mirrors
  `decision(evt)`, wired null-safe (`api?.appeal?.(evt)`). filed → violet bee + deliberation amber
  pulse + argument caption; UPHELD → red flash, bee dies at comb; OVERTURNED → amber flash, bee → INBOX.
  Verified live via CDP: 3D shows the amber overturn beam to the inbox + "OVERTURNED → HUMAN REVIEW".
- Tests: 32 → 35 (appeals: immutable→upheld/no-effect, discretionary→overturned→human, seam never
  auto-grants). All green. Demo loans for the two cases are DISTINCT so a seeded frequency loan never
  pre-empts the banned-language (immutable) case.

## Working mode (current)
- LOCAL ONLY. Do not push/deploy until the user says "push now" (push auto-deploys via Railway).
  Local commits are allowed. Working against http://localhost:8080.
