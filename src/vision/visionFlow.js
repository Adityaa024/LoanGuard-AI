// Vision path (RUBRIC 12 + the Opus-4.8 showcase):
//   upload/scan a document image → Opus 4.8 extracts amount/ref/date →
//   map to a ledger loan → reconcile via the Warden (payment_post) →
//   governed POST on match, or route to the EXCEPTION queue on mismatch.
//
// The reconciliation decision is NOT made here — it is made by the Warden's policy engine,
// so the document flow is governed exactly like every other agent action.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractDocument, isConfigured, modelName } from '../llm/anthropic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(__dirname, '..', '..', 'data')

const VISION_AGENT = 'servicer-01' // the servicing agent that posts reconciled payments

function loanIdFromReference(ref) {
  const m = String(ref || '').match(/(\d{5,})/)
  return m ? 'LN-' + m[1] : null
}

// Resolve which ledger loan a document refers to (by reference, then by last-4).
function resolveLoan(ledger, extracted, hintLoanId) {
  if (hintLoanId && ledger.get(hintLoanId)) return ledger.get(hintLoanId)
  const byRef = loanIdFromReference(extracted.reference)
  if (byRef && ledger.get(byRef)) return ledger.get(byRef)
  if (extracted.accountLast4) {
    for (const loan of ledger.byId.values()) {
      if (String(loan.accountId).slice(-4) === String(extracted.accountLast4)) return loan
    }
  }
  return null
}

/**
 * Scan a seeded demo doc ('match' | 'mismatch') or an uploaded image buffer, then reconcile.
 * @param {object} opts
 * @param {object} opts.orchestrator
 * @param {object} opts.ledger
 * @param {object} opts.meta              data/meta.json (for demo descriptors)
 * @param {'match'|'mismatch'} [opts.which]
 * @param {Buffer} [opts.buffer]          uploaded image bytes (alternative to `which`)
 * @param {string} [opts.mediaType]
 * @param {Date} [opts.now]
 */
export async function scanAndReconcile({ orchestrator, ledger, meta, which = 'match', buffer = null, mediaType = 'image/png', now = new Date() }) {
  let base64
  let descriptor = null
  let hintLoanId = null

  if (buffer) {
    base64 = buffer.toString('base64')
  } else {
    descriptor = meta?.demoDocs?.[which]
    if (!descriptor) throw new Error(`unknown demo doc "${which}"`)
    const imgPath = path.join(DATA, descriptor.file)
    base64 = fs.readFileSync(imgPath).toString('base64')
    hintLoanId = descriptor.loanId
  }

  // 1) Opus 4.8 vision extraction (fallback to the descriptor when no key is configured).
  const fallback = descriptor
    ? { borrower: null, accountLast4: descriptor.accountLast4, reference: descriptor.ref, amount: descriptor.printedAmount, currency: 'MXN', confidence: 0.4, notes: 'descriptor fallback (no live model)' }
    : {}
  const extraction = await extractDocument({ base64, mediaType, fallback })
  const extracted = extraction.data || {}

  // 2) Map to a ledger loan.
  const loan = resolveLoan(ledger, extracted, hintLoanId)
  if (!loan) {
    return {
      stage: 'unresolved',
      visionSource: extraction.source,
      model: isConfigured() ? modelName() : 'offline-fallback',
      extracted,
      decision: null,
      message: 'No matching loan for this document — routed to manual review.',
    }
  }

  // 3) Reconcile through the Warden as a governed payment_post.
  const ledgerExpected = loan.minPayment
  const action = {
    type: 'payment_post',
    agentId: VISION_AGENT,
    loanId: loan.loanId,
    amount: Number(extracted.amount),
    extractedAmount: Number(extracted.amount),
    ledgerExpected,
    source: 'vision',
  }
  const { decision, outcome } = await orchestrator.dispatch(action, { now })

  return {
    stage: decision.decision === 'allow' ? 'posted' : decision.category === 'exception' ? 'exception' : decision.decision,
    visionSource: extraction.source,
    model: extraction.source === 'opus' ? extraction.model : 'offline-fallback',
    extracted,
    loan: { loanId: loan.loanId, accountLast4: String(loan.accountId).slice(-4), ledgerExpected },
    decision,
    outcome,
  }
}
