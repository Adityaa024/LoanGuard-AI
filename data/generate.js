// Synthetic data generator for THE HIVE.
// SYNTHETIC ONLY — no real names, institutions, or identifiers.
// Deterministic (seeded PRNG) so reconciliation tests are stable across runs.
//
// Outputs:
//   data/loans.json      ~5,000 synthetic loans (the portfolio / ledger)
//   data/tasks.json      a worker-agent task set the swarm executes
//   data/demo-statement-match.png      a synthetic loan statement that reconciles
//   data/demo-statement-mismatch.png   a synthetic statement that will NOT reconcile (exception path)
//   data/meta.json       counts + the two demo doc descriptors

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = __dirname

// ---- Seeded PRNG (mulberry32) ------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(0x4849_5645) // "HIVE"
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const between = (min, max) => min + rng() * (max - min)
const intBetween = (min, max) => Math.floor(between(min, max + 1))

// ---- Synthetic name pools (invented; not real people) -------------------
const FIRST = ['Rao', 'Mira', 'Tovin', 'Selka', 'Pem', 'Arlo', 'Juno', 'Caye', 'Nira', 'Bex',
  'Doral', 'Esmae', 'Faro', 'Gante', 'Havi', 'Isolde', 'Jary', 'Kell', 'Lumi', 'Morr',
  'Neela', 'Oxa', 'Prim', 'Quen', 'Riva', 'Sable', 'Teo', 'Ula', 'Vesh', 'Wren']
const LAST = ['Andal', 'Brae', 'Corwen', 'Dath', 'Esker', 'Fenn', 'Grell', 'Hask', 'Ivor', 'Joss',
  'Karr', 'Lond', 'Marsh', 'Nyx', 'Orne', 'Pell', 'Quist', 'Roan', 'Stave', 'Tarn',
  'Urquel', 'Vance', 'Wyld', 'Xeris', 'Yarr', 'Zell']
const REGIONS = ['Norte', 'Sur', 'Centro', 'Bajío', 'Costa', 'Altiplano']
const PRODUCTS = ['personal', 'auto', 'pyme', 'nomina', 'consumo']
const RISK_TIERS = ['low', 'medium', 'high']

function fakeName() {
  return `${pick(FIRST)} ${pick(LAST)}`
}
function loanId(i) {
  return 'LN-' + String(100000 + i)
}
function accountId(i) {
  // synthetic 12-digit-ish account number; only last-4 is ever exposed downstream
  const base = 4000_0000_0000 + i * 7 + intBetween(0, 6)
  return String(base)
}

// ---- Generate loans ------------------------------------------------------
const N = 5000
const loans = []
for (let i = 0; i < N; i++) {
  const principal = Math.round(between(3000, 250000) / 100) * 100
  const paidRatio = between(0, 0.85)
  const balance = Math.round(principal * (1 - paidRatio) * 100) / 100
  const daysPastDue = rng() < 0.42 ? intBetween(1, 180) : 0
  const tier = daysPastDue > 90 ? 'high' : daysPastDue > 30 ? pick(['medium', 'high']) : pick(RISK_TIERS)
  const minPayment = Math.round(balance * between(0.03, 0.08) * 100) / 100
  loans.push({
    loanId: loanId(i),
    accountId: accountId(i),
    borrower: fakeName(),
    product: pick(PRODUCTS),
    region: pick(REGIONS),
    currency: 'MXN',
    principal,
    balance,
    minPayment,
    daysPastDue,
    riskTier: tier,
    // rolling contact history is empty at seed; the engine records contacts as it runs
    contactHistory: [],
    status: daysPastDue > 0 ? 'delinquent' : 'current',
  })
}

// ---- Generate a worker-agent task set ------------------------------------
// The swarm draws from this. Each task names an action TYPE; the Warden decides allow/deny/escalate.
const AGENTS = [
  { agentId: 'collector-01', tier: 'junior', scopeLimit: 5000 },
  { agentId: 'collector-02', tier: 'junior', scopeLimit: 5000 },
  { agentId: 'collector-03', tier: 'senior', scopeLimit: 25000 },
  { agentId: 'servicer-01', tier: 'senior', scopeLimit: 25000 },
  { agentId: 'servicer-02', tier: 'lead', scopeLimit: 100000 },
]

const ACTION_TYPES = ['risk_score', 'outreach', 'payment_post', 'transfer', 'restructure', 'write_off']
const tasks = []
const delinquent = loans.filter((l) => l.status === 'delinquent')
for (let i = 0; i < 240; i++) {
  const loan = delinquent[intBetween(0, delinquent.length - 1)]
  const agent = pick(AGENTS)
  const type = pick(['risk_score', 'risk_score', 'outreach', 'outreach', 'payment_post', 'transfer'])
  tasks.push({
    taskId: 'T-' + String(1000 + i),
    agentId: agent.agentId,
    type,
    loanId: loan.loanId,
  })
}

// ---- Synthetic statement images (for the vision path) --------------------
// We pick a real loan from the portfolio so the "match" doc reconciles with the ledger,
// and craft a "mismatch" doc whose printed amount disagrees with the ledger (exception path).
const matchLoan = delinquent[7]
const mismatchLoan = delinquent[42]

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
}

// Build a deliberately "messy" statement SVG: slight skew, a coffee-stain circle,
// uneven baselines — so the vision model is doing real extraction, not trivial OCR.
function statementSvg(loan, printedAmount, ref) {
  const last4 = loan.accountId.slice(-4)
  const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const skew = -1.4
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="1100" viewBox="0 0 860 1100">
  <rect width="860" height="1100" fill="#f7f5ef"/>
  <rect x="0" y="0" width="860" height="1100" fill="url(#paper)"/>
  <defs>
    <radialGradient id="stain" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#b08a4a" stop-opacity="0.0"/>
      <stop offset="78%" stop-color="#b08a4a" stop-opacity="0.0"/>
      <stop offset="90%" stop-color="#7a5a28" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#7a5a28" stop-opacity="0.05"/>
    </radialGradient>
    <pattern id="paper" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#f7f5ef"/>
      <circle cx="1" cy="1" r="0.4" fill="#e9e6dc"/>
    </pattern>
  </defs>
  <g transform="rotate(${skew} 430 550)">
    <text x="70" y="90" font-family="Georgia, serif" font-size="30" fill="#1c2b3a" font-weight="bold">Meridian Mutual (synthetic)</text>
    <text x="70" y="120" font-family="Georgia, serif" font-size="14" fill="#54606e">Estado de Cuenta — Préstamo / Loan Statement</text>
    <line x1="70" y1="138" x2="790" y2="140" stroke="#9aa6b2" stroke-width="1.5"/>

    <text x="70" y="190" font-family="Helvetica, sans-serif" font-size="15" fill="#2b2b2b">Titular / Account holder:</text>
    <text x="320" y="191" font-family="Helvetica, sans-serif" font-size="15" fill="#101418" font-weight="bold">${escapeXml(loan.borrower)}</text>

    <text x="70" y="224" font-family="Helvetica, sans-serif" font-size="15" fill="#2b2b2b">Cuenta / Account:</text>
    <text x="320" y="225" font-family="Courier, monospace" font-size="15" fill="#101418">**** **** ${last4}</text>

    <text x="70" y="258" font-family="Helvetica, sans-serif" font-size="15" fill="#2b2b2b">Referencia / Ref:</text>
    <text x="320" y="260" font-family="Courier, monospace" font-size="15" fill="#101418">${escapeXml(ref)}</text>

    <text x="70" y="292" font-family="Helvetica, sans-serif" font-size="15" fill="#2b2b2b">Fecha de emisión / Issued:</text>
    <text x="320" y="293" font-family="Helvetica, sans-serif" font-size="15" fill="#101418">06 / 11 / 2026</text>

    <rect x="70" y="330" width="720" height="2" fill="#cfd6dd"/>

    <text x="70" y="380" font-family="Helvetica, sans-serif" font-size="15" fill="#2b2b2b">Saldo actual / Balance:</text>
    <text x="560" y="381" font-family="Helvetica, sans-serif" font-size="15" fill="#101418">${fmt(loan.balance)} MXN</text>

    <text x="70" y="418" font-family="Helvetica, sans-serif" font-size="15" fill="#2b2b2b">Pago mínimo / Min due:</text>
    <text x="560" y="420" font-family="Helvetica, sans-serif" font-size="15" fill="#101418">${fmt(loan.minPayment)} MXN</text>

    <text x="70" y="470" font-family="Helvetica, sans-serif" font-size="17" fill="#1c2b3a" font-weight="bold">Pago recibido / Payment received</text>
    <text x="70" y="500" font-family="Helvetica, sans-serif" font-size="13" fill="#54606e">Gracias por su pago. Aplicado a la cuenta arriba.</text>
    <rect x="60" y="520" width="430" height="70" fill="#eef3ee" stroke="#3f7d4e" stroke-width="1.5" rx="6"/>
    <text x="80" y="565" font-family="Helvetica, sans-serif" font-size="34" fill="#1f5a2c" font-weight="bold" transform="rotate(0.6 80 565)">${fmt(printedAmount)}</text>
    <text x="300" y="565" font-family="Helvetica, sans-serif" font-size="18" fill="#1f5a2c">MXN</text>

    <circle cx="640" cy="560" r="78" fill="url(#stain)"/>
    <text x="70" y="660" font-family="Helvetica, sans-serif" font-size="12" fill="#7a828b">Documento sintético para demostración. No representa una institución real.</text>
    <text x="70" y="980" font-family="Courier, monospace" font-size="11" fill="#9aa6b2">DOC-${escapeXml(ref)} • generated by THE HIVE seed • synthetic</text>
  </g>
</svg>`
}

const matchRef = 'PR-' + matchLoan.loanId.slice(3)
const mismatchRef = 'PR-' + mismatchLoan.loanId.slice(3)
// match doc: printed amount == minPayment (will reconcile against ledger expectation)
const matchAmount = matchLoan.minPayment
// mismatch doc: printed amount deliberately off by a chunk (routes to exceptions)
const mismatchAmount = Math.round((mismatchLoan.minPayment + between(900, 3000)) * 100) / 100

async function renderImages() {
  const jobs = [
    { name: 'demo-statement-match.png', svg: statementSvg(matchLoan, matchAmount, matchRef) },
    { name: 'demo-statement-mismatch.png', svg: statementSvg(mismatchLoan, mismatchAmount, mismatchRef) },
  ]
  // Preserve known-good committed images: many minimal containers lack the fonts to render text,
  // which would produce a blank statement. Skip re-rendering when the files already exist
  // (set HIVE_FORCE_RENDER=1 to force a fresh local render).
  const allExist = jobs.every((j) => fs.existsSync(path.join(OUT, j.name)))
  if (allExist && process.env.HIVE_FORCE_RENDER !== '1') {
    console.log('[seed] demo statement images present — keeping committed renders (skip).')
    return true
  }
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch (e) {
    console.warn('[seed] sharp not installed yet — skipping image render (run after npm install).')
    return false
  }
  for (const j of jobs) {
    await sharp(Buffer.from(j.svg)).png().toFile(path.join(OUT, j.name))
  }
  return true
}

// ---- Write everything ----------------------------------------------------
function writeJson(name, obj) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2))
}

const meta = {
  generatedFrom: 'data/generate.js (seeded mulberry32 0x48495645)',
  synthetic: true,
  loanCount: loans.length,
  taskCount: tasks.length,
  agents: AGENTS,
  demoDocs: {
    match: {
      file: 'demo-statement-match.png',
      loanId: matchLoan.loanId,
      accountLast4: matchLoan.accountId.slice(-4),
      ref: matchRef,
      printedAmount: matchAmount,
      ledgerExpected: matchLoan.minPayment,
      reconciles: true,
    },
    mismatch: {
      file: 'demo-statement-mismatch.png',
      loanId: mismatchLoan.loanId,
      accountLast4: mismatchLoan.accountId.slice(-4),
      ref: mismatchRef,
      printedAmount: mismatchAmount,
      ledgerExpected: mismatchLoan.minPayment,
      reconciles: false,
    },
  },
}

async function main() {
  writeJson('loans.json', loans)
  writeJson('tasks.json', tasks)
  writeJson('meta.json', meta)
  const rendered = await renderImages()
  console.log(
    `[seed] wrote loans.json (${loans.length}), tasks.json (${tasks.length}), meta.json` +
      (rendered ? ', demo statement PNGs' : ' (images skipped)')
  )
}

main().catch((e) => {
  console.error('[seed] failed:', e)
  process.exit(1)
})

export { loans, tasks, meta, AGENTS }
