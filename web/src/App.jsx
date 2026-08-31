import { useState, useCallback, useRef, Suspense, lazy, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Database, 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  FileCode2, 
  ChevronRight, 
  Sparkles, 
  Lock, 
  RefreshCw, 
  UserCheck,
  Building2,
  ExternalLink,
  Zap,
  Globe
} from 'lucide-react'
import { useEventStream } from './api.js'
import OperatorView from './components/UploadView.jsx'
import ExceptionQueue from './components/ExceptionQueue.jsx'
import VerifiedRecords from './components/VerifiedRecords.jsx'
import LoginView from './components/LoginView.jsx'

const Hive3D = lazy(() => import('./Hive3D.jsx'))

const USER_PROFILES = {
  operator: {
    name: 'Aditya Raj',
    role: 'Data Operator',
    email: 'aditya.raj@gmail.com',
    avatar: 'AR',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: 'Ingestion, Normalization & Raw Lineage'
  },
  reviewer: {
    name: 'Rajesh Menon',
    role: 'Exception Reviewer',
    email: 'rajesh.menon@loanguard.ai',
    avatar: 'RM',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    permissions: 'AI Copilot Review, HITL Override & Decision'
  },
  consumer: {
    name: 'Ananya Iyer',
    role: 'Data Consumer',
    email: 'ananya.iyer@loanguard.ai',
    avatar: 'AI',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    permissions: 'Verified Export, Audit Trail & API Access'
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('operator')
  const [user, setUser] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sseConnected, setSseConnected] = useState(true)
  const [stats, setStats] = useState({ total_loans: 0, open_exceptions: 0, verified_loans: 0, data_quality_score: 100 })
  const hiveApi = useRef(null)

  // Fetch summary stats for sidebar counters
  const fetchSummary = useCallback(() => {
    if (!isAuthenticated) return;
    fetch('/api/summary')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) setStats(d.data)
      })
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSummary()
    const interval = setInterval(fetchSummary, 6000)
    return () => clearInterval(interval)
  }, [fetchSummary, isAuthenticated])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    if (userData.role === 'operator') setActiveTab('operator')
    if (userData.role === 'reviewer') setActiveTab('reviewer')
    if (userData.role === 'consumer') setActiveTab('consumer')
  }

  const handleSignOut = () => {
    localStorage.removeItem('loanguard_token')
    setIsAuthenticated(false)
    setUser(null)
  }

  // SSE Stream

  useEventStream(
    useCallback((evt) => {
      setSseConnected(true)
      if (evt.type === 'decision') {
        hiveApi.current?.decision(evt.payload)
        fetchSummary()
      } else if (evt.type === 'rogue') {
        if (evt.payload.status === 'released') hiveApi.current?.rogueSurge()
      } else if (evt.type === 'appeal') {
        hiveApi.current?.appeal?.(evt.payload)
      }
    }, [fetchSummary])
  )

  const TABS = [
    { 
      id: 'operator', 
      label: 'Data Operator', 
      icon: Database, 
      desc: 'Ingestion & Tape Parsing',
      count: stats.total_loans > 0 ? stats.total_loans.toLocaleString() : null,
      countLabel: 'loans'
    },
    { 
      id: 'reviewer', 
      label: 'Exception Reviewer', 
      icon: ShieldAlert, 
      desc: 'AI Copilot & Resolution',
      badge: stats.open_exceptions > 0 ? stats.open_exceptions : null,
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-300'
    },
    { 
      id: 'consumer', 
      label: 'Data Consumer', 
      icon: CheckCircle2, 
      desc: 'Verified Portfolio & Audit',
      count: stats.verified_loans > 0 ? stats.verified_loans.toLocaleString() : null,
      countLabel: 'verified'
    },
    { 
      id: 'hive', 
      label: '3D Swarm Pipeline', 
      icon: Globe, 
      desc: 'Live Event Visualization',
      pill: 'LIVE'
    }
  ]

  const switchPersona = async (email) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('loanguard_token', data.token);
        setUser(data.user);
        if (data.user.role === 'operator') setActiveTab('operator');
        if (data.user.role === 'reviewer') setActiveTab('reviewer');
        if (data.user.role === 'consumer') setActiveTab('consumer');
        setShowUserMenu(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTabClick = async (tabId) => {
    if (tabId === 'operator' && user?.role !== 'operator') {
      await switchPersona('aditya.raj@gmail.com');
    } else if (tabId === 'reviewer' && user?.role !== 'reviewer') {
      await switchPersona('rajesh.menon@loanguard.ai');
    } else if (tabId === 'consumer' && user?.role !== 'consumer') {
      await switchPersona('ananya.iyer@loanguard.ai');
    } else {
      setActiveTab(tabId);
    }
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      
      {/* Sleek Enterprise Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 z-40 relative shadow-[1px_0_4px_0_rgba(0,0,0,0.02)]">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm shadow-indigo-600/30">
              ⬡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 tracking-tight">LoanGuard-AI COPILOT</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">v2.4</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Loan Verification Swarm</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto py-3">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full group flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-tight text-slate-900">{tab.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal truncate">{tab.desc}</div>
                  </div>
                </div>

                {tab.count && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.pill && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                    {tab.pill}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Policy Engine Status Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-600">Warden Guard Active</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">12 POLICIES</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a 
              href="/ai_development_log.md" 
              target="_blank" 
              className="btn-secondary text-[11px] py-1.5 px-2 text-slate-600 justify-center"
            >
              <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
              AI Dev Log
            </a>
            <a 
              href="/api/summary" 
              target="_blank" 
              className="btn-secondary text-[11px] py-1.5 px-2 text-slate-600 justify-center"
            >
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              API Stats
            </a>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        
        {/* Top Institutional Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-30 shrink-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>LoanGuard-AI FinTech</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-900 font-semibold capitalize">
              {activeTab === 'operator' && 'Data Operator / Ingestion & Quality'}
              {activeTab === 'reviewer' && 'Exception Reviewer / Copilot Queue'}
              {activeTab === 'consumer' && 'Data Consumer / Verified Portfolio & Audit'}
              {activeTab === 'hive' && 'Swarm Intelligence / 3D Pipeline Visualizer'}
            </span>
          </div>

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-4">
            {/* Real-time SSE Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono">Live SSE: Online</span>
            </div>

            {/* Quality Pill */}
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs font-medium text-indigo-900">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Data Score: </span>
              <span className="font-bold text-indigo-700">{stats.data_quality_score}%</span>
            </div>

            {/* Active User Switcher Pill & Sign Out */}
            <div className="relative flex items-center gap-3 pl-2 border-l border-slate-200">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-left hover:bg-slate-100/70 p-1.5 rounded-xl transition-colors cursor-pointer"
                title="Switch Demo Persona"
              >
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
                  <div className="text-[10px] text-indigo-600 font-medium capitalize">{user.role} (Switch ▾)</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-indigo-50">
                  {user.avatar}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Persona
                  </div>
                  <button
                    onClick={() => switchPersona('aditya.raj@gmail.com')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${user.email === 'aditya.raj@gmail.com' ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-bold">Aditya Raj</div>
                      <div className="text-[10px] text-slate-400">Data Operator</div>
                    </div>
                    {user.email === 'aditya.raj@gmail.com' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    onClick={() => switchPersona('rajesh.menon@loanguard.ai')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${user.email === 'rajesh.menon@loanguard.ai' ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-bold">Rajesh Menon</div>
                      <div className="text-[10px] text-slate-400">Exception Reviewer</div>
                    </div>
                    {user.email === 'rajesh.menon@loanguard.ai' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    onClick={() => switchPersona('ananya.iyer@loanguard.ai')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${user.email === 'ananya.iyer@loanguard.ai' ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-bold">Ananya Iyer</div>
                      <div className="text-[10px] text-slate-400">Data Consumer</div>
                    </div>
                    {user.email === 'ananya.iyer@loanguard.ai' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Workspace Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 z-10">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'operator' && (
                <motion.div 
                  key="operator" 
                  initial={{ opacity: 0, y: 4 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -4 }} 
                  transition={{ duration: 0.15 }} 
                  className="h-full flex flex-col"
                >
                  <OperatorView />
                </motion.div>
              )}
              {activeTab === 'reviewer' && (
                <motion.div 
                  key="reviewer" 
                  initial={{ opacity: 0, y: 4 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -4 }} 
                  transition={{ duration: 0.15 }} 
                  className="h-full flex flex-col"
                >
                  <ExceptionQueue />
                </motion.div>
              )}
              {activeTab === 'consumer' && (
                <motion.div 
                  key="consumer" 
                  initial={{ opacity: 0, y: 4 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -4 }} 
                  transition={{ duration: 0.15 }} 
                  className="h-full flex flex-col"
                >
                  <VerifiedRecords />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* 3D Viz Container */}
            <div className={`w-full h-full saas-card overflow-hidden ${activeTab === 'hive' ? 'flex flex-col' : 'hidden'}`}>
              <Suspense fallback={
                <div className="flex h-full items-center justify-center bg-slate-950 text-indigo-400">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Initializing 3D Swarm Pipeline Engine...</span>
                  </div>
                </div>
              }>
                <div className="w-full h-full bg-slate-950 relative min-h-[500px]">
                  <Hive3D apiRef={hiveApi} />
                </div>
              </Suspense>
            </div>
          </div>
        </div>

      </main>
      
    </div>
  )
}
