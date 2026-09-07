# 📝 LoanGuard-AI — Engineering & Architecture Notes

## Key Design Principles

1. **Deterministic Verification over Blind LLMs:**
   Financial compliance cannot tolerate stochastic hallucinations. LoanGuard-AI uses deterministic Zod schemas and exact mathematical policy rules for the primary validation gate, while leveraging AI for diagnostic assistance, root-cause explanation, and cluster analysis.

2. **Zero-Trust Human-in-the-Loop:**
   AI recommendations never write directly to the database without explicit reviewer authorization. All manual overrides are sanitized with DOMPurify and recorded on the cryptographic audit ledger.

3. **High-Performance Ingestion:**
   Pre-loaded database indexes, single-transaction batch inserts, and streaming parsers ensure sub-2-second ingestion times for 5,000+ loan records.

4. **Cryptographic Assurance:**
   Each verified loan record receives an immutable SHA-256 digital signature computed from its canonical field string:
   `SHA256(loan_id | borrower_name | principal_balance | interest_rate | origination_date | maturity_date)`
