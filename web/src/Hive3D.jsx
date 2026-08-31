import { useEffect, useMemo, useRef } from 'react'
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
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 12, 24], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Scene apiRef={apiRef} />
      </Canvas>
      <div style={{ position: 'absolute', bottom: 20, left: 20, color: '#fff', fontSize: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
        3D Loan Data Pipeline Visualization (React Three Fiber)
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, background: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }}></span> Ingestion</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, background: '#8b5cf6', borderRadius: '50%' }}></span> Warden Core</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></span> Verified Storage</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: '50%' }}></span> Exception Queue</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, background: '#ec4899', borderRadius: '50%' }}></span> Human Reviewer</div>
      </div>
    </div>
  )
}
