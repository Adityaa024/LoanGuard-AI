# THE HIVE — Live Demo Script

Three beats, ~2:45 total. Each beat has the **UI action** and a **curl** equivalent (so the whole
run is machine-verifiable). Vision and the kill-switch are kept as **backups** (below), not in the
main run.

```bash
export HIVE=https://efficient-adventure-production-85e6.up.railway.app   # or http://localhost:8080
```

> The system seeds ~5,000 synthetic loans and starts the swarm **on boot**. Open the URL and the
> hive is already alive: bees travel from agent stations through the Warden's comb, neutral on the
> way in, colored by the Warden's real verdict (green allow / amber escalate / red deny) on the way
> out — denies are blocked at the comb.

---

## Beat 1 — the swarm working, governed, with harm being prevented (~30s)
**Say:** "This is a swarm of AI agents working a loan portfolio. Every action they take is routed
through the Warden — an independent verifier — before anything happens."

**Do:** Just watch for ~20s. Bees flow through the comb; the **Live decisions** feed fills with
real `ALLOW / DENY / ESCALATE · policyId` rows. Point at the **"🛡 Contained"** strip under the
header — it's ticking up: dollars of over-scope transfers blocked, off-hours contacts, banned
sends, self-approvals gated. **"These numbers are summed straight from the append-only audit log —
not decoration."** Click any feed row → the decision detail (policy, reason, audit entry).

```bash
curl -s $HIVE/api/state | jq '{stats: .stats, prevented: .stats.prevented, integrity: .audit.integrity.valid}'
```

## Beat 2 — the rogue agent, caught live (~75s)
**Say:** "Now a rogue agent. It will try to break policy five different ways. Watch the Warden."

**Do:** Click **⚠ Release rogue agent**. The comb **surges red**, a banner fires
(`WARDEN BLOCKED …`), and a modal lists each attempt with the policy that stopped it:
off-hours `POL-HOURS-001`, banned language `POL-LANG-001`, over-scope `POL-SCOPE-001`,
self-approved write-off `POL-GATE-001` (can't self-approve), and audit tampering
`POL-INTEGRITY-001` (mutate **and** delete both rejected). Verdict: **ALL ATTEMPTS CONTAINED ✓**,
with an Opus 4.8 compliance summary. **"No special case caught the rogue — the same seam every
agent passes through caught it by construction."**

```bash
curl -s -X POST $HIVE/api/demo/rogue | jq '{allBlocked, timeline: [.timeline[] | {label,decision,policyId}]}'
curl -s $HIVE/api/audit/verify | jq   # chain still { valid: true } after the tamper attempts
```

## Beat 3 — author a policy live, in plain English (~60s) — the closer
**Say:** "Governance shouldn't require an engineer. Watch me change the rules in plain language."

**Do:** Click **⚖ Author a policy** (2D view). Type something currently allowed, e.g.
**"no contact on Wednesdays"** or **"block any transfer over $1,500"**. Click **Compile** →
**Opus 4.8** returns a validated `policies.yaml` rule (shown as a YAML preview). Click
**Apply & enforce**. It confirms **"Enforced as POL-AUTH-… — the Warden blocks matching actions
now."** The very next matching action in the feed is denied by your brand-new policy id.
Finish on the audit chain: the **act of authoring** is itself logged (`policy.author`, authorizer
`human`) and **integrity still reads VERIFIED ✓**. **"The person who owns compliance just changed
what the agents are allowed to do — and that change is itself under governance."**

```bash
# compile (Opus 4.8 → structured rule), then apply through the governed path:
RULE=$(curl -s -X POST $HIVE/api/policy/compile -H 'content-type: application/json' \
  -d '{"text":"block any transfer over $1,500"}')
echo "$RULE" | jq '{source, valid, rule: {id:.rule.id, kind:.rule.kind, params:.rule.params}}'
curl -s -X POST $HIVE/api/policy/apply -H 'content-type: application/json' \
  -d "{\"rule\": $(echo "$RULE" | jq -c .rule), \"actor\":\"compliance-officer\"}" | jq '{ok, policyId, auditSeq}'
# the policy-author event is on the hash chain; the chain still verifies:
curl -s "$HIVE/api/audit?limit=300" | jq '[.entries[] | select(.actionType=="policy.author")] | last'
curl -s $HIVE/api/audit/verify | jq
```

---

## Backups (only if asked / if time)
- **Vision (Opus 4.8):** **⬡ Scan document** → reads the synthetic statement, reconciles, posts;
  **scan mismatch** → routes to exceptions. **upload your own…** reads any real receipt for real,
  routes to manual review (no synthetic-ledger match).
- **Kill-switch:** **⏻ Kill-switch** → banner "ALL AGENTS HALTED"; any action denied `kill_switch`
  (authoring is halted too); **Reset** resumes.
- **Audit export:** Audit panel → **export regulator report ↗** (Markdown, hash-chain attestation).

> Engine-before-beauty: remove the visualization and all of the above still runs end-to-end —
> ingest, decide, block, escalate, author, log. The hive is the skin; the Warden is the substance.
