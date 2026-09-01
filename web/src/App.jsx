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
  Globe,
  X,
  Search,
  Check
} from 'lucide-react'
import { useEventStream } from './api.js'
import OperatorView from './components/UploadView.jsx'
import ExceptionQueue from './components/ExceptionQueue.jsx'
import VerifiedRecords from './components/VerifiedRecords.jsx'
import LoginView from './components/LoginView.jsx'

const Hive3D = lazy(() => import('./Hive3D.jsx'))

const USER_PROFILES = {
  operator: {
    name: 'Aditya',
    role: 'Data Operator',
    email: 'aditya.raj@gmail.com',
    avatar: 'A',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: 'Ingestion, Normalization & Raw Lineage'
  },
  reviewer: {
    name: 'Rajesh Menon',
    role: 'Reviewer',
    email: 'rajesh.menon@loanguard.ai',
    avatar: 'RM',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    permissions: 'Exception Queue, AI Review & Audit Sign-off'
  },
  consumer: {
    name: 'Alex Morgan',
    role: 'Data Consumer',
    email: 'alex.morgan@loanguard.ai',
    avatar: 'AM',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    permissions: 'Verified Export, Audit Trail & API Access'
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(USER_PROFILES.operator)
  const [activeTab, setActiveTab] = useState('operator')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showPolicyCatalog, setShowPolicyCatalog] = useState(false)
  const [sseConnected, setSseConnected] = useState(true)
  const [stats, setStats] = useState({ total_loans: 0, open_exceptions: 0, verified_loans: 0, data_quality_score: 100 })
  const hiveApi = useRef(null)

  // Auto-switch displayed persona when tab changes (demo convenience)
  const activePersona = activeTab === 'reviewer' ? USER_PROFILES.reviewer 
    : activeTab === 'consumer' ? USER_PROFILES.consumer 
    : USER_PROFILES.operator;
  const displayUser = user ? { ...user, name: activePersona.name, role: activePersona.role, avatar: activePersona.avatar } : null;

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
    
    const handleSwitchTab = (e) => {
      if (e.detail) setActiveTab(e.detail);
    };
    const handleOpenPolicies = () => {
      setShowPolicyCatalog(true);
    };
    window.addEventListener('switch_tab', handleSwitchTab);
    window.addEventListener('open_policy_catalog', handleOpenPolicies);

    return () => {
      clearInterval(interval);
      window.removeEventListener('switch_tab', handleSwitchTab);
      window.removeEventListener('open_policy_catalog', handleOpenPolicies);
    };
  }, [fetchSummary, isAuthenticated])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    try {
      localStorage.setItem('loanguard_user', JSON.stringify(userData));
    } catch {}
    if (userData.role === 'operator') setActiveTab('operator')
    if (userData.role === 'reviewer') setActiveTab('reviewer')
    if (userData.role === 'consumer') setActiveTab('consumer')
  }

  const handleSignOut = () => {
    localStorage.removeItem('loanguard_token')
    localStorage.removeItem('loanguard_user')
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

  const WORKSPACE_TABS = [
    { 
      id: 'operator', 
      label: 'Data Operator', 
      icon: Database, 
      desc: 'Ingestion & Tape Parsing',
      count: stats.total_loans > 0 ? stats.total_loans.toLocaleString() : null
    },
    { 
      id: 'reviewer', 
      label: 'Exception Reviewer', 
      icon: ShieldAlert, 
      desc: 'AI Copilot & Resolution',
      badge: stats.open_exceptions > 0 ? stats.open_exceptions.toLocaleString() : null
    },
    { 
      id: 'consumer', 
      label: 'Data Consumer', 
      icon: CheckCircle2, 
      desc: 'Verified Portfolio & Audit',
      count: stats.verified_loans > 0 ? stats.verified_loans.toLocaleString() : null
    }
  ]

  const TOOLS_TABS = [
    { 
      id: 'hive', 
      label: '3D Pipeline Visualizer', 
      icon: Globe, 
      desc: 'Visual Tape Architecture',
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

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Dynamic Institutional Left Navigation Sidebar */}
      <aside className="w-56 border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 select-none">
        
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 tracking-tight">LoanGuard-AI</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">v2.4</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Loan Tape Verification Copilot</p>
            </div>
          </div>
        </div>

        {/* Navigation — Grouped Sections */}
        <nav className="p-3 flex-1 overflow-y-auto">
          {/* WORKSPACE */}
          <div className="mb-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2.5 mb-1.5">Workspace</div>
            <div className="space-y-1">
              {WORKSPACE_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-50/80 text-emerald-950 font-semibold shadow-xs border border-emerald-200/80' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-tight text-slate-900 truncate">{tab.label}</div>
                        <div className="text-[9px] text-slate-400 font-normal truncate">{tab.desc}</div>
                      </div>
                    </div>
                    {tab.count && (
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {tab.count}
                      </span>
                    )}
                    {tab.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOOLS */}
          <div className="mb-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2.5 mb-1.5">Tools</div>
            <div className="space-y-1">
              {TOOLS_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-50/80 text-emerald-950 font-semibold shadow-xs border border-emerald-200/80' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-tight text-slate-900 truncate">{tab.label}</div>
                        <div className="text-[9px] text-slate-400 font-normal truncate">{tab.desc}</div>
                      </div>
                    </div>
                    {tab.pill && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                        {tab.pill}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
        
        {/* SYSTEM Section */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-1">System</div>
          <button 
            onClick={() => setShowPolicyCatalog(true)}
            className="w-full flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all cursor-pointer shadow-2xs group text-left"
            title="Click to view all 12 active validation policy rules"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-slate-700 group-hover:text-emerald-950">Policy Engine</span>
            </div>
            <span className="text-[9px] font-bold font-mono text-emerald-800 bg-emerald-50 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
              12 POLICIES
            </span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <a 
              href="/ai_development_log.md" 
              target="_blank" 
              className="btn-secondary text-[10px] py-1.5 px-2 text-slate-600 hover:text-emerald-900 justify-center"
            >
              <FileCode2 className="w-3 h-3 text-slate-400" />
              AI Dev Log
            </a>
            <a 
              href="/api/summary" 
              target="_blank" 
              className="btn-secondary text-[10px] py-1.5 px-2 text-slate-600 hover:text-emerald-900 justify-center"
            >
              <Activity className="w-3 h-3 text-slate-400" />
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
              {activeTab === 'hive' && 'Visual Tape Verification Pipeline'}
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
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50/60 border border-emerald-200/60 rounded-lg text-xs font-medium text-emerald-900">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Quality</span>
              <span className="font-bold text-emerald-700">{stats.data_quality_score}%</span>
            </div>

            {/* Active User Switcher Pill & Sign Out */}
            <div className="relative flex items-center gap-3 pl-2 border-l border-slate-200">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-left hover:bg-slate-100/70 p-1.5 rounded-xl transition-colors cursor-pointer"
                title="Switch Demo Persona"
              >
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{displayUser?.name || user.name}</div>
                  <div className="text-[10px] text-emerald-600 font-medium capitalize">{displayUser?.role || user.role} (Switch ▾)</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-emerald-50">
                  {displayUser?.avatar || user.avatar}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Persona
                  </div>
                  <button
                    onClick={() => { switchPersona('aditya.raj@gmail.com'); setActiveTab('operator'); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${activeTab === 'operator' ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-bold">Aditya</div>
                      <div className="text-[10px] text-slate-400">Data Operator</div>
                    </div>
                    {activeTab === 'operator' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => { switchPersona('rajesh.menon@loanguard.ai'); setActiveTab('reviewer'); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${activeTab === 'reviewer' ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-bold">Rajesh Menon</div>
                      <div className="text-[10px] text-slate-400">Reviewer</div>
                    </div>
                    {activeTab === 'reviewer' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => { switchPersona('alex.morgan@loanguard.ai'); setActiveTab('consumer'); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${activeTab === 'consumer' ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-bold">Alex Morgan</div>
                      <div className="text-[10px] text-slate-400">Data Consumer</div>
                    </div>
                    {activeTab === 'consumer' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
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
              {activeTab === 'hive' && (
                <motion.div 
                  key="hive" 
                  initial={{ opacity: 0, y: 4 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -4 }} 
                  transition={{ duration: 0.15 }} 
                  className="h-full flex flex-col saas-card p-0 overflow-hidden bg-slate-950 min-h-[550px]"
                >
                  <Suspense fallback={
                    <div className="flex h-full items-center justify-center bg-slate-950 text-indigo-400">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Initializing 3D Swarm Pipeline Engine...</span>
                      </div>
                    </div>
                  }>
                    <Hive3D apiRef={hiveApi} />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>
      
      {/* Global Policy Engine Catalog Modal */}
      {showPolicyCatalog && (
        <PolicyCatalogModal onClose={() => setShowPolicyCatalog(false)} />
      )}

    </div>
  )
}

function PolicyCatalogModal({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const POLICIES = [
    { id: 'POL-BAL-001', name: 'Positive Balance Invariant', severity: 'CRITICAL', field: 'principal_balance', desc: 'Validates that principal balance is strictly positive (non-negative, non-zero).' },
    { id: 'POL-RATE-001', name: 'Interest Rate Corridor', severity: 'HIGH', field: 'interest_rate', desc: 'Verifies interest rates fall within the compliant corridor (0.5% to 25.0%). Negative rates trigger Critical escalation.' },
    { id: 'POL-BOR-001', name: 'Borrower Name Non-Null', severity: 'HIGH', field: 'borrower_name', desc: 'Ensures obligor identity is specified and not blank or unassigned.' },
    { id: 'POL-DATE-001', name: 'Chronological Sanity Check', severity: 'CRITICAL', field: 'maturity_date', desc: 'Enforces that maturity_date must strictly succeed origination_date.' },
    { id: 'POL-STATE-001', name: 'State Code ISO Standardization', severity: 'LOW', field: 'property_state', desc: 'Validates 2-letter uppercase US state abbreviations (e.g. CA, WA, TX, NY).' },
    { id: 'POL-DUP-001', name: 'Duplicate Loan ID Interceptor', severity: 'CRITICAL', field: 'loan_id', desc: 'Strictly forbids duplicate loan identifiers across active and historical portfolios.' },
    { id: 'POL-BALCAP-001', name: 'Balance vs Principal Cap', severity: 'HIGH', field: 'current_balance', desc: 'Current unpaid balance should not exceed original disbursed principal.' },
    { id: 'POL-PAYST-001', name: 'Payment Status Consistency', severity: 'MEDIUM', field: 'payment_status', desc: 'If payment status is marked Current, days past due (DPD) must strictly equal 0.' },
    { id: 'POL-CLOSED-001', name: 'Closed Loan Balance Check', severity: 'HIGH', field: 'loan_status', desc: 'Loans marked as closed or paid off must not retain a positive unpaid balance.' },
    { id: 'POL-DOC-001', name: 'Document Availability Manifest', severity: 'MEDIUM', field: 'document_status', desc: 'Validates promissory note and deed attachment in the document repository.' },
    { id: 'POL-STALE-001', name: 'Stale Record Detector', severity: 'LOW', field: 'last_updated_at', desc: 'Flags records where tape update timestamp is older than 90 days.' },
    { id: 'POL-BORCMB-001', name: 'Duplicate Obligor Combination', severity: 'HIGH', field: 'borrower_id', desc: 'Identifies suspicious duplicate borrower with same loan amount and origination date.' },
    { id: 'POL-CONFLICT-001', name: 'Cross-Source Tape Conflict', severity: 'HIGH', field: 'source_system', desc: 'Detects data discrepancy between originator baseline tape and servicer monthly update.' },
  ];

  const filtered = POLICIES.filter(p => {
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSev = severityFilter === 'ALL' || p.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Intain Policy Verification Engine</h3>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                  {POLICIES.length} ACTIVE RULES
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Automated statutory loan tape compliance rules and severity levels</p>
            </div>
          </div>
          <button 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer" 
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-white flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search rule ID, field, name, or description..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  severityFilter === sev 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Rules Grid */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(p => (
              <div key={p.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-1.5 hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100">
                    {p.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    p.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    p.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    p.severity === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {p.severity}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 pt-0.5">{p.name}</div>
                <div className="text-[11px] text-slate-600 leading-relaxed">{p.desc}</div>
                <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>Target Field:</span>
                  <span className="text-indigo-600 font-bold bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">{p.field}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
          <div className="text-xs text-slate-500 font-medium">
            All rules execute deterministically at $O(1)$ in-memory before SQLite commit.
          </div>
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4 cursor-pointer">
            Close Catalog
          </button>
        </div>
      </div>
    </div>
  );
}
