# LoanGuard-AI — Official 5-Minute Demo Quality Control Report

## Video Specifications
- **File Name**: `LoanGuard-AI_Intain_Demo_Final.mp4`
- **Raw Master**: `LoanGuard-AI_Demo_Raw.mp4`
- **Narration Script**: `LoanGuard-AI_Demo_Script.txt`
- **Duration**: 2m 25s (145.14 seconds)
- **Resolution**: 1920 × 1080 (Full HD, 16:9 Aspect Ratio)
- **Framerate**: 30 FPS
- **Video Codec**: H.264 / AVC (High Profile, CRF 18)
- **Audio Codec**: AAC (192 kbps, 24kHz Stereo)
- **Voice Engine**: Microsoft Azure Neural Voice (`en-US-GuyNeural`)

---

## 13 Completed Live Scenes & Narrative Flow

| Scene # | Scene Title | Persona / Scope | Live Action Verified | Status |
|---|---|---|---|:---:|
| **Scene 1** | Login + Data Operator | Data Operator (`Aditya Raj`) | Selected Operator card, signed in, loaded dashboard | **PASS** |
| **Scene 2** | Loan Tape Ingestion | Data Operator | Primary Tape + Adversarial preset -> Ingestion run | **PASS** |
| **Scene 3** | Validation Summary & Policies | Data Operator | 3 KPI metrics reconciled & 12 Policy Rules modal opened | **PASS** |
| **Scene 4** | Failed Rows Report & Lineage | Data Operator | Failed Rows Report inspected with offending fields & reasons | **PASS** |
| **Scene 5** | Reviewer Transition | Exception Reviewer (`Rajesh Menon`) | Switched to Reviewer persona & Exception Queue | **PASS** |
| **Scene 6** | AI Diagnostics & Copilot | Exception Reviewer | Selected exception row -> AI Root Cause & Recommendation | **PASS** |
| **Scene 7** | Human-in-the-Loop Interaction | Exception Reviewer | Clicked 'Apply to Draft' -> Decoupled 3-state diff + Note | **PASS** |
| **Scene 8** | Approve & Verify | Exception Reviewer | Clicked 'Approve & Verify' -> Status updated to Verified | **PASS** |
| **Scene 9** | Data Consumer Dashboard | Data Consumer (`Ananya Iyer`) | Switched to Consumer persona -> Verified Portfolio KPIs | **PASS** |
| **Scene 10** | Verify Ledger & Audit Trail | Data Consumer | Clicked 'Verify Ledger Integrity' -> SHA-256 Merkle chain | **PASS** |
| **Scene 11** | Verified Record REST API | Data Consumer | Navigated to `/api/verified-loans` REST JSON response | **PASS** |
| **Scene 12** | AI Development Log | Compliance / System | Navigated to `/ai_development_log.md` engineering audit | **PASS** |
| **Scene 13** | Architectural Conclusion | Architectural Close | Final canonical overview & architectural summary | **PASS** |

---

## Quality Assurance Invariants Verified

1. [x] **No Contradictory Numbers**: Live database counts match between sidebar, KPIs, and canonical tables.
2. [x] **Decoupled 3-State Model**: Source values, AI suggestions, and final human values remain distinct.
3. [x] **Zero Silent Modifications**: AI suggestions require human approval to enter the verified ledger.
4. [x] **Cryptographic Provenance**: SHA-256 Merkle hash chain verified.
5. [x] **Duration Compliance**: Under the 5:00 maximum limit (2m 25s).

## Final Demo Readiness
**STATUS: PASS (100% PS COMPLIANT & READY FOR INTAIN SUBMISSION)**
