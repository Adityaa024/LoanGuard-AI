import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'

// THE HIVE visualization. Agents = stations around the rim; the Warden = the hex comb at center.
// Every REAL Warden decision (received over SSE) sends a "bee" from its agent toward the comb.
// The bee travels NEUTRAL (undecided) inbound; the comb reveals the real verdict color as it
// passes through (green allow / amber escalate / red deny); allow/escalate return colored, while
// deny is blocked at the comb and dissipates there. The rogue surges the whole comb red.

const COLORS = {
  bg: 0x0a0d13,
  comb: 0xf6b73c,
  combDim: 0x7a5a12,
  allow: 0x36d399,
  escalate: 0xf6b73c,
  deny: 0xff4d4d,
  neutral: 0xe6edf5, // inbound, pre-decision (undecided action en route to the Warden)
  station: 0x2b3a4a,
  stationEdge: 0x3f5468,
  text: 0xcdd6e0,
  rogue: 0xff3b3b,
  appeal: 0xa76eff, // appeals-01 — governed negotiation (violet)
  appealEdge: 0x6d4aa6,
}

const AGENTS = ['collector-01', 'collector-02', 'collector-03', 'servicer-01', 'servicer-02']

function hexPoints(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return pts
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function Hive({ onReady }) {
  const hostRef = useRef(null)
  const appRef = useRef(null)
  const S = useRef({
    bees: [],
    flashes: [],
    appeals: [], // in-flight appeal "bees" (violet)
    caption: null, // { text, color, t } shown at the comb during an appeal
    deliberate: 0, // seconds of sustained amber comb pulse while the Warden deliberates
    inboxMarker: { x: 0, y: 0 },
    stations: new Map(),
    comb: { x: 0, y: 0, r: 70 },
    combPulse: 0,
    combColor: COLORS.comb,
    surge: 0,
    layers: {},
    t: 0,
  })

  useEffect(() => {
    let destroyed = false
    const app = new Application()
    const st = S.current

    const layout = () => {
      const w = app.screen.width
      const h = app.screen.height
      st.comb = { x: w / 2, y: h / 2, r: Math.max(46, Math.min(w, h) * 0.085) }
      const ring = Math.min(w, h) * 0.36
      st.stations.clear()
      // five agents + rogue slot + the violet appeals-01 station
      const all = [...AGENTS, 'rogue', 'appeals']
      all.forEach((id, i) => {
        const ang = (-Math.PI / 2) + (i / all.length) * Math.PI * 2
        st.stations.set(id, {
          x: st.comb.x + Math.cos(ang) * ring,
          y: st.comb.y + Math.sin(ang) * ring,
          label: id === 'appeals' ? 'appeals-01' : id,
          rogue: id === 'rogue',
          appeals: id === 'appeals',
        })
      })
      // human-review inbox marker (where OVERTURNED appeals are routed). Placed in the OPEN GAP
      // between the two right-side nodes (collector-02 @ idx1, collector-03 @ idx2 → bisector idx
      // 1.5), pushed just OUTSIDE the station ring so it never overlaps a node, label, or spoke.
      const mAng = (-Math.PI / 2) + (1.5 / all.length) * Math.PI * 2
      let mx = st.comb.x + Math.cos(mAng) * ring * 1.24
      let my = st.comb.y + Math.sin(mAng) * ring * 1.24
      mx = Math.min(mx, w - 76) // safety: stay on-canvas with padding for the label/reticle
      my = Math.max(my, 46)
      st.inboxMarker = { x: mx, y: my }
    }

    const drawStatic = () => {
      const g = st.layers.static
      g.removeChildren()
      // comb glow base (concentric translucent hexes — fake bloom, no filter dependency)
      const glow = new Graphics()
      for (let k = 5; k >= 1; k--) {
        glow.poly(hexPoints(st.comb.x, st.comb.y, st.comb.r + k * 10)).fill({ color: COLORS.comb, alpha: 0.04 })
      }
      g.addChild(glow)
      // honeycomb cluster (7 hexes)
      const comb = new Graphics()
      const r = st.comb.r * 0.4
      const offs = [[0, 0], [1, 0], [-1, 0], [0.5, 0.87], [-0.5, 0.87], [0.5, -0.87], [-0.5, -0.87]]
      for (const [dx, dy] of offs) {
        comb.poly(hexPoints(st.comb.x + dx * r * 1.7, st.comb.y + dy * r * 1.7, r)).stroke({ width: 2, color: COLORS.comb, alpha: 0.85 })
      }
      g.addChild(comb)
      const wlabel = new Text({ text: 'THE WARDEN', style: { fill: COLORS.comb, fontSize: 12, fontFamily: 'monospace', letterSpacing: 3 } })
      wlabel.anchor.set(0.5)
      wlabel.position.set(st.comb.x, st.comb.y + st.comb.r + 22)
      g.addChild(wlabel)

      // stations + connecting filaments
      for (const [, s] of st.stations) {
        const link = new Graphics()
        link.moveTo(st.comb.x, st.comb.y).lineTo(s.x, s.y).stroke({ width: 1, color: COLORS.stationEdge, alpha: 0.25 })
        g.addChild(link)
        const fill = s.rogue ? 0x3a1414 : s.appeals ? 0x241a3a : COLORS.station
        const edge = s.rogue ? COLORS.rogue : s.appeals ? COLORS.appeal : COLORS.stationEdge
        const node = new Graphics()
        node.poly(hexPoints(s.x, s.y, 18)).fill({ color: fill }).stroke({ width: 1.5, color: edge })
        g.addChild(node)
        const t = new Text({ text: s.label, style: { fill: s.rogue ? 0xff8888 : s.appeals ? 0xcdb1ff : COLORS.text, fontSize: 10, fontFamily: 'monospace' } })
        t.anchor.set(0.5)
        t.position.set(s.x, s.y + 30)
        g.addChild(t)
      }

      // human-review inbox marker — a DESTINATION INDICATOR, not a control. Drawn as a faint
      // target reticle (corner brackets + crosshair) so it never reads as a clickable button;
      // the actual approve/deny lives in the inbox column on the right.
      const im = st.inboxMarker
      const mk = new Graphics()
      const w = 22, h = 15, cs = 7
      const brackets = [
        [[-w, -h + cs], [-w, -h], [-w + cs, -h]],
        [[w - cs, -h], [w, -h], [w, -h + cs]],
        [[-w, h - cs], [-w, h], [-w + cs, h]],
        [[w - cs, h], [w, h], [w, h - cs]],
      ]
      for (const [a, b, c] of brackets) {
        mk.moveTo(im.x + a[0], im.y + a[1]).lineTo(im.x + b[0], im.y + b[1]).lineTo(im.x + c[0], im.y + c[1])
      }
      mk.stroke({ width: 1.25, color: 0x6a86ad, alpha: 0.6 })
      // faint crosshair dot at the landing point
      mk.circle(im.x, im.y, 2).fill({ color: 0x9fc0ff, alpha: 0.5 })
      mk.moveTo(im.x - 5, im.y).lineTo(im.x + 5, im.y).moveTo(im.x, im.y - 5).lineTo(im.x, im.y + 5)
        .stroke({ width: 0.75, color: 0x6a86ad, alpha: 0.4 })
      g.addChild(mk)
      const il = new Text({ text: 'human inbox →', style: { fill: 0x86a0c4, fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, fontStyle: 'italic' } })
      il.anchor.set(0.5)
      il.position.set(im.x, im.y + 26)
      il.alpha = 0.8
      g.addChild(il)
    }

    ;(async () => {
      await app.init({ background: COLORS.bg, antialias: true, resizeTo: hostRef.current, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true })
      if (destroyed) {
        app.destroy(true)
        return
      }
      hostRef.current.appendChild(app.canvas)
      appRef.current = app

      st.layers.static = new Container()
      st.layers.dynamic = new Container()
      app.stage.addChild(st.layers.static, st.layers.dynamic)

      layout()
      drawStatic()

      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000
        st.t += dt
        const dyn = st.layers.dynamic
        dyn.removeChildren()

        // comb pulse + surge + deliberation decay
        st.combPulse = Math.max(0, st.combPulse - dt * 2.2)
        st.surge = Math.max(0, st.surge - dt * 0.8)
        st.deliberate = Math.max(0, st.deliberate - dt)

        // breathing comb ring
        const breathe = 0.5 + 0.5 * Math.sin(st.t * 1.4)
        const ring = new Graphics()
        const ringColor = st.combPulse > 0 ? st.combColor : COLORS.comb
        ring.poly(hexPoints(st.comb.x, st.comb.y, st.comb.r + 6 + breathe * 3 + st.combPulse * 30))
          .stroke({ width: 2 + st.combPulse * 4, color: ringColor, alpha: 0.3 + st.combPulse * 0.6 })
        dyn.addChild(ring)

        // deliberation: sustained amber pulse around the comb while an appeal is under review
        if (st.deliberate > 0) {
          const db = 0.5 + 0.5 * Math.sin(st.t * 9)
          const dr = new Graphics()
          dr.poly(hexPoints(st.comb.x, st.comb.y, st.comb.r + 14 + db * 6))
            .stroke({ width: 2.5, color: COLORS.escalate, alpha: 0.35 + 0.4 * db })
          dyn.addChild(dr)
        }

        // red surge overlay (rogue)
        if (st.surge > 0) {
          const surge = new Graphics()
          surge.rect(0, 0, app.screen.width, app.screen.height).fill({ color: COLORS.rogue, alpha: 0.06 * st.surge })
          dyn.addChild(surge)
        }

        // animate bees
        const g = new Graphics()
        for (const b of st.bees) {
          b.t += dt / b.dur
          let x, y
          if (b.t < 0.5) {
            // station -> comb (inbound: action is still UNDECIDED → neutral color)
            const u = b.t / 0.5
            x = lerp(b.from.x, st.comb.x, u)
            y = lerp(b.from.y, st.comb.y, u)
          } else {
            // comb -> back (outbound: now carries the Warden's real verdict color)
            const u = (b.t - 0.5) / 0.5
            x = lerp(st.comb.x, b.from.x, u)
            y = lerp(st.comb.y, b.from.y, u)
          }
          // Reveal the REAL decision exactly at the comb (the Warden's boundary).
          if (!b.flashed && b.t >= 0.5) {
            b.flashed = true
            st.combPulse = 1
            st.combColor = b.decisionColor
            st.flashes.push({ x: st.comb.x, y: st.comb.y, color: b.decisionColor, t: 0, big: b.rogue || b.decision === 'deny' })
            // DENY is blocked at the boundary: stops dead at the comb and dissipates — never returns.
            if (b.decision === 'deny') b.dead = true
          }
          if (b.dead) continue
          const col = b.t < 0.5 ? COLORS.neutral : b.decisionColor
          // trail
          g.circle(x, y, b.rogue ? 6 : 4).fill({ color: col, alpha: 0.95 })
          g.circle(x, y, b.rogue ? 12 : 8).fill({ color: col, alpha: 0.18 })
        }
        st.bees = st.bees.filter((b) => b.t < 1 && !b.dead)
        dyn.addChild(g)

        // ---- appeal bees (violet): filed → deliberate → ruling (upheld dies / overturned → inbox) ----
        const ag = new Graphics()
        for (const a of st.appeals) {
          a.t += dt
          let x, y, color = COLORS.appeal, alpha = 1
          if (!a.arrived) {
            const u = Math.min(1, a.t / a.inDur)
            x = lerp(a.from.x, st.comb.x, u)
            y = lerp(a.from.y, st.comb.y, u)
            if (u >= 1) a.arrived = true
          } else if (!a.status) {
            // holding at the comb while the Warden deliberates
            x = st.comb.x; y = st.comb.y
            alpha = 0.7 + 0.3 * Math.sin(st.t * 9)
          } else if (a.status === 'upheld') {
            a.dieT += dt
            x = st.comb.x; y = st.comb.y; color = COLORS.deny
            alpha = Math.max(0, 1 - a.dieT / 0.6)
            if (a.dieT > 0.6) a.done = true
          } else {
            // overturned: travel from the comb out to the human-review inbox marker
            a.outT += dt
            const uo = Math.min(1, a.outT / 0.85)
            x = lerp(st.comb.x, st.inboxMarker.x, uo)
            y = lerp(st.comb.y, st.inboxMarker.y, uo)
            color = COLORS.escalate
            if (a.outT > 1.2) a.done = true
          }
          ag.circle(x, y, 5).fill({ color, alpha })
          ag.circle(x, y, 12).fill({ color, alpha: alpha * 0.2 })
        }
        st.appeals = st.appeals.filter((a) => !a.done)
        dyn.addChild(ag)

        // appeal caption near the comb
        if (st.caption) {
          st.caption.t += dt
          if (st.caption.t > 4.2) {
            st.caption = null
          } else {
            const a = st.caption.t < 3.4 ? 1 : Math.max(0, 1 - (st.caption.t - 3.4) / 0.8)
            const cap = new Text({
              text: st.caption.text,
              style: { fill: st.caption.color, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', align: 'center', wordWrap: true, wordWrapWidth: 340 },
            })
            cap.anchor.set(0.5, 0)
            cap.alpha = a
            cap.position.set(st.comb.x, st.comb.y + st.comb.r + 40)
            dyn.addChild(cap)
          }
        }

        // flash rings at the comb
        const fg = new Graphics()
        for (const f of st.flashes) {
          f.t += dt * 2
          const rr = (f.big ? 60 : 28) + f.t * (f.big ? 220 : 120)
          fg.poly(hexPoints(f.x, f.y, rr)).stroke({ width: 3 * (1 - f.t), color: f.color, alpha: Math.max(0, 0.8 * (1 - f.t)) })
        }
        st.flashes = st.flashes.filter((f) => f.t < 1)
        dyn.addChild(fg)
      })

      const onResize = () => {
        layout()
        drawStatic()
      }
      window.addEventListener('resize', onResize)
      st._cleanup = () => window.removeEventListener('resize', onResize)

      const apiObj = {
        // evt is a REAL Warden decision from the backend over SSE; we only choose how to draw it.
        decision(evt) {
          const decisionColor = COLORS[evt.decision] || COLORS.allow
          const rogue = evt.rogue || String(evt.agentId || '').startsWith('rogue')
          const station = st.stations.get(rogue ? 'rogue' : evt.agentId) || st.stations.get('rogue')
          if (!station) return
          st.bees.push({ from: station, t: 0, dur: 1.1, decision: evt.decision, decisionColor, rogue, flashed: false, dead: false })
        },
        rogueSurge() {
          st.surge = 1
        },
        // Multi-Agent Appeals — mirrors decision(); fed by SSE 'appeal' events. evt.status is the
        // REAL Warden ruling; the viz only chooses how to draw it.
        appeal(evt) {
          const status = evt?.status
          if (status === 'filed') {
            const station = st.stations.get('appeals')
            if (!station) return
            st.appeals.push({ from: station, t: 0, inDur: 0.9, arrived: false, status: null, dieT: 0, outT: 0, done: false })
            st.deliberate = 1.4 // sustained amber comb pulse during review
            const arg = (evt.argument || '').replace(/\s+/g, ' ').trim()
            st.caption = { text: `appeals-01 · ${arg ? '“' + arg.slice(0, 80) + (arg.length > 80 ? '…”' : '”') : 'appeal filed'}`, color: COLORS.appeal, t: 0 }
          } else if (status === 'upheld' || status === 'overturned') {
            // resolve the most recent un-ruled appeal bee
            const a = [...st.appeals].reverse().find((x) => !x.status)
            if (a) { a.status = status; a.arrived = true }
            st.deliberate = 0
            st.combPulse = 1
            st.combColor = status === 'upheld' ? COLORS.deny : COLORS.escalate
            st.flashes.push({ x: st.comb.x, y: st.comb.y, color: st.combColor, t: 0, big: true })
            st.caption = status === 'upheld'
              ? { text: 'UPHELD → POLICY IMMUTABLE', color: COLORS.deny, t: 0 }
              : { text: 'OVERTURNED → ROUTED TO HUMAN REVIEW', color: COLORS.escalate, t: 0 }
          }
        },
      }
      onReady && onReady(apiObj)
    })()

    return () => {
      destroyed = true
      try {
        S.current._cleanup && S.current._cleanup()
        app.destroy(true)
      } catch {
        /* noop */
      }
    }
  }, [])

  return <div ref={hostRef} className="hive-canvas" />
}
