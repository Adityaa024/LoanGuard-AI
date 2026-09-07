import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// LoanGuard-AI — 3D Loan Pipeline Visualization.
// Visualizes data ingestion -> Warden validation -> Verified Storage / Exception Queue.
// Every record ingested creates a beam. Resolving exceptions creates beams from the Reviewer.

const COLORS = {
  ingest: 0x3b82f6,      // blue
  verified: 0x10b981,    // green (allow)
  exception: 0xf59e0b,   // amber (escalate)
  rejected: 0xef4444,    // red (deny)
  warden: 0x8b5cf6,      // violet
  reviewer: 0xec4899     // pink
}

const NODES = {
  ingestion: new THREE.Vector3(-12, 1, 0),
  warden: new THREE.Vector3(0, 1, 0),
  verified: new THREE.Vector3(12, 1, -6),
  exceptions: new THREE.Vector3(8, 1, 8),
  reviewer: new THREE.Vector3(0, 1, 10)
}

const MAX_BEAMS = 150
const COMET = 0.25

function makeFx() {
  return { pulse: 0, surge: 0, color: new THREE.Color(COLORS.warden) }
}

function Node({ position, color, label, size = 1, geometry = 'box' }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.5
      ref.current.rotation.x += dt * 0.2
    }
  })
  
  return (
    <group position={position}>
      <mesh ref={ref}>
        {geometry === 'box' && <boxGeometry args={[size, size, size]} />}
        {geometry === 'octa' && <octahedronGeometry args={[size, 0]} />}
        {geometry === 'icosa' && <icosahedronGeometry args={[size, 1]} />}
        <meshStandardMaterial color={0x111111} emissive={color} emissiveIntensity={0.8} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Glow ring */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[size * 1.5, 0.05, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} />
      </mesh>
    </group>
  )
}

function WardenNode({ fx }) {
  const core = useRef()
  const ringA = useRef()
  const ringB = useRef()
  const baseColor = useMemo(() => new THREE.Color(COLORS.warden), [])
  
  useFrame((_, dt) => {
    fx.pulse = Math.max(0, fx.pulse - dt * 2.0)
    fx.surge = Math.max(0, fx.surge - dt * 0.6)
    
    if (core.current) {
      const s = 1.5 + fx.pulse * 0.3 + fx.surge * 0.2
      core.current.scale.setScalar(s)
      core.current.rotation.y -= dt * 0.8
      
      const m = core.current.material
      const target = fx.surge > 0.01 ? new THREE.Color(COLORS.rejected)
        : fx.pulse > 0.01 ? fx.color
        : baseColor
      m.emissive.lerp(target, 0.2)
      m.emissiveIntensity = 1.5 + fx.pulse * 2.0 + fx.surge * 2.5
    }
    if (ringA.current) ringA.current.rotation.z += dt * 1.0
    if (ringB.current) {
      ringB.current.rotation.x += dt * 0.7
      ringB.current.rotation.y += dt * 0.4
    }
  })
  
  return (
    <group position={NODES.warden}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color={0x0a0a0a} emissive={COLORS.warden} emissiveIntensity={1.5} wireframe />
      </mesh>
      <mesh ref={ringA}>
        <torusGeometry args={[2.5, 0.05, 16, 100]} />
        <meshBasicMaterial color={COLORS.warden} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh ref={ringB}>
        <torusGeometry args={[3.2, 0.02, 16, 100]} />
        <meshBasicMaterial color={COLORS.ingest} transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <pointLight color={COLORS.warden} intensity={2} distance={20} />
    </group>
  )
}

function Connections() {
  const material = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.2, toneMapped: false })
  
  const drawLine = (from, to) => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to])
    return <line geometry={geo} material={material} />
  }
  
  return (
    <group>
      {drawLine(NODES.ingestion, NODES.warden)}
      {drawLine(NODES.warden, NODES.verified)}
      {drawLine(NODES.warden, NODES.exceptions)}
      {drawLine(NODES.reviewer, NODES.exceptions)}
      {drawLine(NODES.exceptions, NODES.verified)}
    </group>
  )
}

function Beams({ apiRef, fx }) {
  const beams = useRef(Array.from({ length: MAX_BEAMS }, () => ({ active: false, phase: 0 })))
  const cursor = useRef(0)
  
  const posAttr = useMemo(() => new THREE.BufferAttribute(new Float32Array(MAX_BEAMS * 2 * 3), 3), [])
  const colAttr = useMemo(() => new THREE.BufferAttribute(new Float32Array(MAX_BEAMS * 2 * 3), 3), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', posAttr)
    g.setAttribute('color', colAttr)
    return g
  }, [posAttr, colAttr])
  
  const tip = useMemo(() => new THREE.Vector3(), [])
  const tail = useMemo(() => new THREE.Vector3(), [])
  const c = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    const spawn = (evt) => {
      // evt from SSE: decision (allow/escalate/deny), actionType, etc.
      let idx = -1
      for (let k = 0; k < MAX_BEAMS; k++) {
        const i = (cursor.current + k) % MAX_BEAMS
        if (!beams.current[i].active) { idx = i; break }
      }
      if (idx === -1) idx = cursor.current % MAX_BEAMS
      cursor.current = (idx + 1) % MAX_BEAMS
      
      const b = beams.current[idx]
      b.active = true
      b.t = 0
      
      // Route based on action
      if (evt.actionType === 'exception_resolution') {
        b.type = 'resolution'
        b.decision = evt.decision // allow = resolved, deny = rejected
        b.phase = 0 // Reviewer -> Exceptions
        b.dur = 1.0
      } else {
        b.type = 'ingest'
        b.decision = evt.decision || 'allow'
        b.phase = 0 // Ingestion -> Warden
        b.dur = 1.0
      }
    }
    
    // Simulate some traffic for the demo if none provided
    const simulateTraffic = () => {
      if (Math.random() > 0.6) {
        const decision = Math.random() > 0.8 ? 'escalate' : Math.random() > 0.9 ? 'deny' : 'allow'
        spawn({ actionType: 'ingest_loan_record', decision })
      }
    }
    const interval = setInterval(simulateTraffic, 500)
    
    apiRef.current = { decision: spawn, rogueSurge: () => { fx.surge = 1 } }
    return () => clearInterval(interval)
  }, [apiRef, fx])

  const pos = posAttr.array
  const col = colAttr.array
  const hide = (o) => { for (let k = 0; k < 6; k++) { pos[o + k] = 0; col[o + k] = 0 } }
  
  const write = (o, hex, alpha) => {
    c.setHex(hex)
    pos[o] = tail.x; pos[o + 1] = tail.y; pos[o + 2] = tail.z
    pos[o + 3] = tip.x; pos[o + 4] = tip.y; pos[o + 5] = tip.z
    const aT = alpha * 0.1 // tail dim
    col[o] = c.r * aT; col[o + 1] = c.g * aT; col[o + 2] = c.b * aT
    col[o + 3] = c.r * alpha; col[o + 4] = c.g * alpha; col[o + 5] = c.b * alpha
  }

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_BEAMS; i++) {
      const b = beams.current[i]
      const o = i * 6
      if (!b.active) { hide(o); continue }

      b.t += dt
      
      if (b.type === 'ingest') {
        if (b.phase === 0) {
          // Ingestion -> Warden
          const u = b.t / b.dur
          tip.lerpVectors(NODES.ingestion, NODES.warden, u)
          tail.lerpVectors(NODES.ingestion, NODES.warden, Math.max(0, u - COMET))
          write(o, COLORS.ingest, 1)
          
          if (u >= 1) {
            b.phase = 1
            b.t = 0
            b.dur = 1.2
            // Warden hit effect
            fx.pulse = 1
            fx.color.setHex(b.decision === 'allow' ? COLORS.verified : b.decision === 'escalate' ? COLORS.exception : COLORS.rejected)
            
            // If deny, kill it here
            if (b.decision === 'deny') b.phase = 99 // dead
          }
        } else if (b.phase === 1) {
          // Warden -> Dest
          const dest = b.decision === 'allow' ? NODES.verified : NODES.exceptions
          const hex = b.decision === 'allow' ? COLORS.verified : COLORS.exception
          
          const u = b.t / b.dur
          tip.lerpVectors(NODES.warden, dest, u)
          tail.lerpVectors(NODES.warden, dest, Math.max(0, u - COMET))
          write(o, hex, 1)
          
          if (u >= 1) b.active = false
        } else {
          hide(o)
          b.active = false
        }
      } else if (b.type === 'resolution') {
        if (b.phase === 0) {
          // Reviewer -> Exception Queue
          const u = b.t / b.dur
          tip.lerpVectors(NODES.reviewer, NODES.exceptions, u)
          tail.lerpVectors(NODES.reviewer, NODES.exceptions, Math.max(0, u - COMET))
          write(o, COLORS.reviewer, 1)
          
          if (u >= 1) {
            b.phase = 1
            b.t = 0
            if (b.decision === 'deny') b.phase = 99 // rejected entirely
          }
        } else if (b.phase === 1) {
          // Exception -> Verified
          const u = b.t / b.dur
          tip.lerpVectors(NODES.exceptions, NODES.verified, u)
          tail.lerpVectors(NODES.exceptions, NODES.verified, Math.max(0, u - COMET))
          write(o, COLORS.verified, 1)
          if (u >= 1) b.active = false
        } else {
          hide(o)
          b.active = false
        }
      }
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

function Scene({ apiRef }) {
  const fx = useMemo(makeFx, [])
  return (
    <>
      <color attach="background" args={[0x07090e]} />
      <fog attach="fog" args={[0x07090e, 10, 40]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} />
      <Stars radius={80} depth={40} count={3000} factor={4} saturation={0} fade speed={1} />
      
      <gridHelper args={[60, 60, 0x16202c, 0x0a0f15]} position={[0, -0.5, 0]} />
      
      <WardenNode fx={fx} />
      
      <Node position={NODES.ingestion} color={COLORS.ingest} size={1.2} geometry="octa" />
      <Node position={NODES.verified} color={COLORS.verified} size={1.5} geometry="box" />
      <Node position={NODES.exceptions} color={COLORS.exception} size={1.3} geometry="icosa" />
      <Node position={NODES.reviewer} color={COLORS.reviewer} size={1.0} geometry="octa" />
      
      <Connections />
      <Beams apiRef={apiRef} fx={fx} />
      
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.05} minDistance={10} maxDistance={35} autoRotate autoRotateSpeed={0.3} target={[0, 0, 0]} />
      
      <EffectComposer disableNormalPass>
        <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </>
  )
}

export default function Hive3D({ apiRef }) {
  const [activeBeamsCount, setActiveBeamsCount] = useState(0);
  const [pulseCount, setPulseCount] = useState(0);

  const handleSimulateBatch = (type) => {
    if (!apiRef?.current?.decision) return;
    if (type === 'clean') {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          apiRef.current.decision({ actionType: 'ingest_loan_record', decision: 'allow' });
        }, i * 120);
      }
    } else if (type === 'anomaly') {
      if (apiRef.current.rogueSurge) apiRef.current.rogueSurge();
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          apiRef.current.decision({ actionType: 'ingest_loan_record', decision: i % 2 === 0 ? 'escalate' : 'deny' });
        }, i * 150);
      }
    } else if (type === 'resolve') {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          apiRef.current.decision({ actionType: 'exception_resolution', decision: 'allow' });
        }, i * 140);
      }
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col">
      {/* 3D Canvas */}
      <div className="flex-1 w-full h-full relative min-h-[500px]">
        <Canvas 
          camera={{ position: [0, 14, 26], fov: 45 }} 
          dpr={[1, 2]} 
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        >
          <Scene apiRef={apiRef} />
        </Canvas>
      </div>

      {/* Top Left Interactive Control Panel */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-slate-900/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 shadow-xl max-w-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-white">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Swarm Telemetry</span>
        </div>

        <div className="text-[11px] text-slate-300 leading-relaxed">
          Interactive WebGL pipeline simulator. Click to inject simulated loan events:
        </div>

        <div className="grid grid-cols-1 gap-1.5 pt-1">
          <button
            onClick={() => handleSimulateBatch('clean')}
            className="text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-between cursor-pointer"
          >
            <span>+ Ingest Compliant Loans</span>
            <span className="font-mono text-[9px] bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-400">ALLOW</span>
          </button>

          <button
            onClick={() => handleSimulateBatch('anomaly')}
            className="text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 transition-all flex items-center justify-between cursor-pointer"
          >
            <span>+ Inject Critical Anomalies</span>
            <span className="font-mono text-[9px] bg-rose-950/80 px-1.5 py-0.5 rounded text-rose-400">SURGE</span>
          </button>

          <button
            onClick={() => handleSimulateBatch('resolve')}
            className="text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 transition-all flex items-center justify-between cursor-pointer"
          >
            <span>+ AI HITL Resolution Wave</span>
            <span className="font-mono text-[9px] bg-purple-950/80 px-1.5 py-0.5 rounded text-purple-400">RESOLVE</span>
          </button>
        </div>
      </div>

      {/* Top Right Node Color Legend */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 text-[11px] bg-slate-900/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 shadow-xl text-slate-200">
        <div className="font-bold text-white text-xs pb-1.5 border-b border-slate-800">
          Pipeline Topography
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-400/30"></span>
          <span>Ingestion Gateway</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-400/30"></span>
          <span>Warden Policy Core (12 Rules)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/30"></span>
          <span>Verified Storage (SHA-256)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-400/30"></span>
          <span>Exception Quarantine Pool</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-pink-400/30"></span>
          <span>Reviewer Copilot Station</span>
        </div>
      </div>

      {/* Bottom Floating Navigation Hint */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 text-xs bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-slate-400">
        <span className="text-slate-300 font-semibold">Controls:</span>
        <span>Left Click + Drag: Rotate 360°</span>
        <span className="text-slate-700">•</span>
        <span>Scroll: Zoom In/Out</span>
      </div>
    </div>
  )
}
