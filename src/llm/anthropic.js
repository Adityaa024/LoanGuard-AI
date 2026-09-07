// Thin wrapper around the Anthropic SDK. One place that knows the model + how we call it.
// Used by the vision path and the rogue agent's reasoning. Degrades gracefully when no key
// is configured (clearly-labelled deterministic fallback) so the engine still runs offline.

import 'dotenv/config'

const MODEL = process.env.HIVE_MODEL || 'claude-opus-4-8'

let _client = null
function client() {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY || process.env.HIVE_OFFLINE === '1') return null
  // Lazy import so the server boots even if the SDK/key is absent.
  // eslint-disable-next-line import/no-extraneous-dependencies
  return import('@anthropic-ai/sdk').then((mod) => {
    _client = new mod.default({ apiKey: process.env.ANTHROPIC_API_KEY })
    return _client
  })
}

export function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY && process.env.HIVE_OFFLINE !== '1'
}

export function modelName() {
  return MODEL
}

// Extract the first JSON object from a model response (tolerant of prose/code fences).
function parseJsonLoose(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no JSON object in model output')
  return JSON.parse(candidate.slice(start, end + 1))
}

/**
 * Vision: read a document image with Opus 4.8 and extract structured payment fields.
 * @returns {Promise<{source:'opus'|'fallback', data:object, raw?:string}>}
 */
export async function extractDocument({ base64, mediaType = 'image/png', fallback = null }) {
  const c = await client()
  if (!c) {
    // No live model — return the known descriptor so the rest of the flow can run offline.
    return { source: 'fallback', data: fallback || {}, note: 'ANTHROPIC_API_KEY not set; using descriptor fallback' }
  }
  const prompt = `You are reading a loan/payment statement document image. Extract these fields and
return ONLY a JSON object (no prose):
{
  "borrower": string|null,
  "accountLast4": string|null,        // last 4 digits only, if visible
  "reference": string|null,           // payment/document reference like "PR-100024"
  "amount": number|null,              // the PAYMENT RECEIVED amount as a number (no currency symbol/commas)
  "currency": string|null,            // e.g. "MXN"
  "date": string|null,                // issue/payment date as printed
  "confidence": number,               // 0..1 your confidence in the amount
  "notes": string                     // anything notable (smudges, ambiguity)
}
The document may be messy, skewed, or stained. The PAYMENT RECEIVED amount is the highlighted figure.`

  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })
  const text = resp.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n')
  const data = parseJsonLoose(text)
  return { source: 'opus', model: MODEL, data, raw: text }
}

/**
 * Structured output via tool-use: force the model to return a validated object matching `tool`'s
 * input_schema (used by the NL→policy compiler). Returns the tool input, or `fallback` if no key.
 * @returns {Promise<{source:'opus'|'fallback', data:object|null}>}
 */
export async function extractStructured({ system, prompt, tool, fallback = null }) {
  const c = await client()
  if (!c) return { source: 'fallback', data: fallback }
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content: prompt }],
  })
  const block = resp.content.find((b) => b.type === 'tool_use')
  if (!block) throw new Error('model did not return a tool_use block')
  return { source: 'opus', model: MODEL, data: block.input }
}

/**
 * Text reasoning (used by the rogue agent to author its own out-of-policy attempts).
 * @returns {Promise<{source:'opus'|'fallback', text:string}>}
 */
export async function complete({ system, prompt, maxTokens = 512, fallback = '' }) {
  const c = await client()
  if (!c) return { source: 'fallback', text: fallback }
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n')
  return { source: 'opus', model: MODEL, text }
}
