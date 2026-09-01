# Intain Problem Statement Gap Audit

Status: Evidence-based audit of the current application against the actual Intain Full Stack Track problem statement.

This report was produced without changing application code.

## 1) Executive summary

The repository is a polished demo-grade application and it passes its own custom validation suite and CSV smoke tests. However, compared against the actual Intain problem statement, the app still has several material gaps:

- The system is closer to a tightly-controlled demo workflow than a full PS-compliant product.
- Several required dataset and workflow artifacts are not implemented as first-class PS components.
- Some AI and policy features are mock/simulated rather than operationally connected to real configuration or real-model control.
- The app does not demonstrate a clean startup in a fresh environment without port conflict issues.

In short: it is strong as a product demo, but weaker as a direct implementation of the stated challenge requirements.

---

## 2) Verified strengths

These items are implemented and visible in the codebase and verification output:

- CSV upload and basic normalization flow exists in [src/routes.js](src/routes.js#L103-L213)
- JWT role gating exists in [src/routes.js](src/routes.js#L23-L69)
- Exception queue and summary APIs exist in [src/routes.js](src/routes.js#L268-L337) and [src/routes.js](src/routes.js#L339-L441)
- Verified-record / audit APIs exist in [src/routes.js](src/routes.js#L431-L520)
- Policy schema and guard logic exist in [src/guard/schema.js](src/guard/schema.js#L1-L57) and [src/guard/localPolicyEngine.js](src/guard/localPolicyEngine.js#L1-L260)
- AI explanation endpoints exist in [src/routes.js](src/routes.js#L521-L689)
- The project includes agentic-development documentation in [ai_development_log.md](ai_development_log.md)

The custom validation suite also reports pass status, and the latest command output confirms:

- `npm test` -> 28/28 passing
- `npm run build` -> Vite production build succeeded

Those are real strengths, but they do not eliminate the PS compliance gaps below.

---

## 3) Material gaps against the actual problem statement

### Gap 1 — The app does not treat `servicer_update.csv`, `document_manifest.csv`, and `validation_rules.json` as first-class PS artifacts

Problem statement requirement: the default dataset package explicitly includes:

- `loan_tape.csv`
- `servicer_update.csv`
- `document_manifest.csv`
- `validation_rules.json`
- `users.json`
- `expected_exception_sample.csv`

Observed behavior:

- The upload endpoint accepts a generic single file with `upload.single('file')` and does not present a distinct typed workflow for each PS artifact: [src/routes.js](src/routes.js#L103-L213)
- There is no real first-class ingestion path for loading a `document_manifest` or `servicer_update` dataset as a distinct source type with separate schema handling and typed reconciliation logic.
- The current app stores all uploaded rows in one generic `loans` table and treats source differences mostly as ad hoc checks rather than a proper multi-source ingestion model.

Impact:

- The system behaves more like a generic demo CSV cleaner than a real multi-source loan verification pipeline.
- It misses the PS requirement for a curated synthetic package with multiple source files and distinct processing roles.

Severity: High

---

### Gap 2 — The AI rule generator is a mock simulation, not an operational rule configuration engine

Problem statement requirement: AI assistance must explain, suggest, and generate validation rules or tests from natural language, while preserving human approval control.

Observed behavior:

- The rule-generation endpoint is a placeholder response object that does not persist to the application’s validation engine or configuration files: [src/routes.js](src/routes.js#L686-L784)
- The code explicitly says it intentionally does not add the generated rule to in-memory validation rules for safety: [src/routes.js](src/routes.js#L694-L705)
- The generated payload is a UI mockup, not an actual production rule system.

Impact:

- The app presents AI rule generation, but the generated rule is not operationally live.
- This is a functional mismatch with the challenge’s requirement for an actual validation-rule workflow tied to the app’s ruleset.

Severity: High

---

### Gap 3 — The app does not implement a true failed-row / failed-import reporting workflow as described by the PS

Problem statement requirement: identify failed import rows and preserve source-file lineage.

Observed behavior:

- The upload endpoint returns summary counts only: `recordsProcessed`, `validCount`, `exceptionCount`: [src/routes.js](src/routes.js#L162-L182)
- There is a `upload_batches` table and lineage data, but the app does not expose a proper failed rows report or row-level reject reasons in a way that matches the expected dataset behavior.
- The code stores exception rows but not an explicit row-by-row import report with raw offending records attached to the upload.

Impact:

- The app does not provide a strong operational QA workflow for “what failed to import and why” as described in the PS.
- It is okay for demo metrics but not as a direct PS-compliant file ingestion system.

Severity: Medium

---

### Gap 4 — The app’s AI workflow is more rule-based explanation than true AI integration or production-grade prompt logging

Problem statement requirement: show AI recommendation separately from final human decision; log AI-generated suggestions in the audit trail; show prompt/model/timestamp metadata where feasible.

Observed behavior:

- AI responses are generated from switch statements with hardcoded explanations and heuristics, not real model calls: [src/routes.js](src/routes.js#L521-L689)
- The response includes `model: 'LoanGuard-AI Copilot v1.0 (Rule-Based Diagnostic Engine)'`, which is a heuristic engine label rather than an external LLM integration: [src/routes.js](src/routes.js#L671-L684)
- Audit logging exists, but the AI suggestion metadata is a simplified placeholder, not a robust prompt ledger for a production AI system.

Impact:

- The app demonstrates a diagnostic copilot, but it is not a model-backed or enterprise-grade AI workflow per the challenge text.
- This is a gap in the “AI-assisted review and agentic coding discipline” spirit of the PS.

Severity: Medium

---

### Gap 5 — The runtime is not cleanly startable in a fresh environment due to port conflict / startup fragility

This is not a code defect in the application logic alone, but it is a real operational gap when checking readiness against the challenge requirement of a runnable app.

Observed behavior:

- Starting the app directly with `node src/server.js` failed because port 8080 was already in use by another process.
- The project relies on explicit port usage and did not fail gracefully or select an alternate port in a clean environment.

Impact:

- The app is not robustly deployable or restartable in a clean VM/container environment without manual intervention.
- This weakens the “working application: hosted deployment or local runnable version” requirement.

Severity: Medium

---

### Gap 6 — Security and dependency hygiene are not clean enough for a production-grade claim

Problem statement requirement: application should be a working end-to-end system with sensible production controls.

Observed behavior:

- `npm run build` reported 4 vulnerabilities (1 moderate, 3 high) from the frontend dependency tree.
- Vite also reported large chunk warnings for the front-end bundle.
- The project uses a custom local sanitizer rather than a standard hardened security stack and still contains large client bundles.

Impact:

- This is not a blocker for a demo, but it is a real gap if the application is presented as production-ready or enterprise-grade.

Severity: Medium

---

### Gap 7 — The “full module coverage” is still partially marketing-heavy rather than strictly PS-evidence backed by the real system

The repository contains extensive documentation asserting 100% compliance and complete module coverage, but the actual runtime behavior is narrower than the docs imply.

Examples:

- The README and QA artifacts claim near-complete module parity: [README.md](README.md)
- The required PS artifacts such as `document_manifest.csv` and `expected_exception_sample.csv` are present as static files, but the application does not truly exercise them as distinct, structured workflows: [data](data)

Impact:

- The documents are stronger than the actual runtime implementation in some areas.
- This creates an audit mismatch between claims and actual application behavior.

Severity: Medium

---

## 4) Direct evidence map

| Area | Evidence | Observation |
| --- | --- | --- |
| Generic upload flow | [src/routes.js](src/routes.js#L103-L213) | Single-file upload path; no explicit typed `servicer_update` / `document_manifest` workflow |
| Rule generation is mock | [src/routes.js](src/routes.js#L686-L784) | Generated rule is returned but not persisted or activated |
| AI explanation is rule-based | [src/routes.js](src/routes.js#L521-L689) | Hardcoded logic tree; not real model-backed AI |
| Schema/validation is strict but limited | [src/guard/schema.js](src/guard/schema.js#L1-L57) | Good boundary rules, but not full PS dataset workflow |
| Demo docs claim full compliance | [README.md](README.md), [QA_BRUTAL_AUDIT.md](QA_BRUTAL_AUDIT.md), [RUBRIC.md](RUBRIC.md) | Strong marketing/compliance docs, but reality is narrower than the claims |
| App start is not robust | Terminal startup output from `node src/server.js` | Failed on EADDRINUSE because port 8080 was already occupied |
| Build is successful but not clean | `npm run build` output | Production build passed, but with 4 vulnerabilities and chunk-size warnings |

---

## 5) Bottom line

This app is a strong feature demo and passes a custom red-team suite, but it does not fully align with the literal Intain Full Stack Track problem statement in several material ways:

1. It does not implement the PS’s multi-source dataset lifecycle as a first-class design.
2. The “AI rule generator” and other AI features are mock-style, not real operational AI flow.
3. Failed-import tracing and dataset-specific workflows are thinner than the PS wording implies.
4. Runtime readiness is not clean in a fresh environment because port binding is fragile.
5. The repo claims stronger compliance than the actual implementation can directly prove under a strict PS-only audit.

This is not a “code is broken” verdict. It is a “PS compliance gap” verdict for a polished but still demo-oriented implementation.

---

## 6) Final verdict

Assessment: Functional demo with meaningful engineering quality, but not a fully airtight PS-compliant implementation.

- Demo quality: strong
- Custom test pass rate: strong
- Strict PS fidelity: partial gaps remain
- Production-readiness: moderate, with startup and dependency hygiene concerns
