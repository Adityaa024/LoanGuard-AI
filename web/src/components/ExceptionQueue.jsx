import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  ArrowRight, 
  Search, 
  Filter, 
  Check, 
  RotateCcw, 
  Edit3, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Info,
  RefreshCw,
  Layers,
  Home,
  DollarSign,
  Calendar,
  CreditCard,
  Building,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { useToast } from '../ToastContext.jsx';

export default function ExceptionQueue() {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExc, setSelectedExc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [ruleFilter, setRuleFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toast = useToast();

  const fetchExceptions = useCallback(() => {
    fetch('/api/exceptions')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (selectedExc) {
            const stillOpen = d.data.find(e => e.id === selectedExc.id);
            setSelectedExc(stillOpen || (d.data.length > 0 ? d.data[0] : null));
          } else if (d.data.length > 0) {
            setSelectedExc(d.data[0]);
          }
          setExceptions(d.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedExc]);

  useEffect(() => { fetchExceptions() }, [fetchExceptions]);

  // Unique Rule IDs
  const availableRules = useMemo(() => {
    const set = new Set();
    exceptions.forEach(e => { if (e.rule_id) set.add(e.rule_id); });
    return Array.from(set).sort();
  }, [exceptions]);

  // Counts by severity
  const severityCounts = useMemo(() => {
    const counts = { ALL: exceptions.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    exceptions.forEach(e => {
      const s = (e.severity || 'low').toUpperCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [exceptions]);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(exc => {
      const matchesSearch = 
        (exc.loan_id && exc.loan_id.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (exc.rule_name && exc.rule_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exc.description && exc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exc.field && exc.field.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSeverity = severityFilter === 'ALL' || exc.severity.toUpperCase() === severityFilter;
      const matchesRule = ruleFilter === 'ALL' || exc.rule_id === ruleFilter;
      return matchesSearch && matchesSeverity && matchesRule;
    });
  }, [exceptions, searchTerm, severityFilter, ruleFilter]);

  const currentIndex = selectedExc ? filteredExceptions.findIndex(e => e.id === selectedExc.id) : -1;
  
  const handleNext = useCallback(() => {
    if (currentIndex < filteredExceptions.length - 1) {
      setSelectedExc(filteredExceptions[currentIndex + 1]);
    }
  }, [currentIndex, filteredExceptions]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedExc(filteredExceptions[currentIndex - 1]);
    }
  }, [currentIndex, filteredExceptions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExceptions.length && filteredExceptions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExceptions.map(e => e.id)));
    }
  };

  const toggleSelectOne = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Resolution
  const handleBulkResolve = async (action = 'approve') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selectedIds);
    let resolvedCount = 0;

    for (const id of ids) {
      try {
        const exc = exceptions.find(e => e.id === id);
        let corrected = null;
        if (exc) {
          if (exc.rule_id === 'POL-BAL-001' && exc.current_value) corrected = Math.abs(parseFloat(exc.current_value) || 0);
          else if (exc.rule_id === 'POL-RATE-001' && exc.current_value) {
            const val = parseFloat(exc.current_value) || 0;
            corrected = val > 25 ? (val / 10).toFixed(2) : Math.abs(val).toFixed(2);
          } else if (exc.rule_id === 'POL-STATE-001' && exc.current_value) {
            corrected = exc.current_value.toUpperCase().slice(0, 2);
          }
        }

        await fetch(`/api/exceptions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action, 
            note: `Bulk ${action} via HITL workbench`, 
            corrected_value: corrected 
          })
        });
        resolvedCount++;
      } catch (err) {
        console.error("Bulk resolve error:", err);
      }
    }

    setBulkBusy(false);
    setSelectedIds(new Set());
    fetchExceptions();
    toast.success("Bulk Operation Completed", `Successfully processed ${resolvedCount} exceptions.`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-indigo-600"></div>
          <span>Loading exception queue & policy engine state...</span>
        </div>
      </div>
    );
  }

  const isAllSelected = filteredExceptions.length > 0 && selectedIds.size === filteredExceptions.length;

  return (
    <div className="flex h-full gap-6 relative">
      
      {/* Left Pane: Queue List */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedExc ? 'hidden lg:flex lg:w-[45%]' : 'w-full'}`}>
        
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Exception Review Queue</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {exceptions.length} Pending
              </span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Use ↑ ↓ keys to navigate
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate flagged compliance anomalies and resolve them using AI Copilot suggestions.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl mb-3 overflow-x-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
            const count = severityCounts[sev] || 0;
            const isSelected = severityFilter === sev;
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isSelected 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <span>{sev}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/60 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Rule Filter Bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search ID, Rule, Field or Violation..." 
              className="input-field pl-8 py-1.5 text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {availableRules.length > 0 && (
            <select
              value={ruleFilter}
              onChange={e => setRuleFilter(e.target.value)}
              className="input-field py-1.5 px-2.5 text-xs w-auto bg-white"
            >
              <option value="ALL">All Rules ({availableRules.length})</option>
              {availableRules.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>

        {/* Exceptions Table Card */}
        <div className="saas-card p-0 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            {filteredExceptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-500 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-700">
                  {exceptions.length === 0 ? 'All exceptions have been cleared!' : 'No exceptions match current filters.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Portfolio data meets active Warden policies.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2.5 w-8 text-center">
                      <button 
                        onClick={toggleSelectAll} 
                        className="text-slate-400 hover:text-indigo-600"
                        title="Select all on this view"
                      >
                        {isAllSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="px-3 py-2.5">Loan Reference</th>
                    <th className="px-3 py-2.5">Field / Rule</th>
                    <th className="px-3 py-2.5 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExceptions.map(exc => {
                    const isSelected = selectedExc?.id === exc.id;
                    const isChecked = selectedIds.has(exc.id);
                    return (
                      <tr
                        key={exc.id}
                        onClick={() => setSelectedExc(exc)}
                        className={`cursor-pointer transition-colors group ${
                          isSelected 
                            ? 'bg-indigo-50/80 border-l-3 border-indigo-600' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center" onClick={(e) => toggleSelectOne(exc.id, e)}>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 inline" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400 inline" />
                          )}
                        </td>

                        <td className="table-cell">
                          <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {exc.loan_id}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                            {exc.description || exc.rule_name}
                          </div>
                        </td>

                        <td className="table-cell">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {exc.field}
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {exc.rule_id}
                          </div>
                        </td>

                        <td className="table-cell text-right">
                          <SeverityBadge severity={exc.severity} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Right Pane: Reviewer Copilot Workbench & Loan Collateral Inspector */}
      {selectedExc ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <ReviewerWorkbench 
            key={selectedExc.id} 
            exc={selectedExc} 
            onResolved={() => {
              toast.success("Exception Resolved", `Loan ${selectedExc.loan_id} updated and signed.`);
              fetchExceptions();
            }}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={currentIndex < filteredExceptions.length - 1}
            hasPrev={currentIndex > 0}
            position={`${currentIndex + 1} of ${filteredExceptions.length}`}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center saas-card p-12 text-slate-400">
          <div className="text-center">
            <SlidersHorizontal className="w-10 h-10 mb-3 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-700">Select an exception to open the AI Copilot Workbench</p>
            <p className="text-[11px] text-slate-400 mt-1">Review root cause explanations, diffs, and sign off verified records.</p>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4"
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                {selectedIds.size}
              </span>
              <span>selected</span>
            </div>

            <div className="h-4 w-px bg-slate-700"></div>

            <button
              onClick={() => handleBulkResolve('approve')}
              disabled={bulkBusy}
              className="btn-primary text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500"
            >
              {bulkBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Bulk Auto-Fix & Approve</span>
            </button>

            <button
              onClick={() => handleBulkResolve('reject')}
              disabled={bulkBusy}
              className="btn-secondary text-xs py-1.5 px-3 bg-slate-800 text-rose-400 hover:bg-slate-700 border-slate-700"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Bulk Reject</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-white p-1"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function SeverityBadge({ severity }) {
  const s = (severity || 'low').toLowerCase();
  if (s === 'critical') {
    return (
      <span className="badge-critical text-[10px]">
        <ShieldAlert className="w-3 h-3" />
        Critical
      </span>
    );
  }
  if (s === 'high') {
    return (
      <span className="badge-high text-[10px]">
        <AlertTriangle className="w-3 h-3" />
        High
      </span>
    );
  }
  if (s === 'medium') {
    return (
      <span className="badge-medium text-[10px]">
        <AlertOctagon className="w-3 h-3" />
        Medium
      </span>
    );
  }
  return (
    <span className="badge-low text-[10px]">
      <Info className="w-3 h-3" />
      Low
    </span>
  );
}

function ReviewerWorkbench({ exc, onResolved, onNext, onPrev, hasNext, hasPrev, position }) {
  const [aiReview, setAiReview] = useState(null);
  const [loanData, setLoanData] = useState(null);
  const [loadingAi, setLoadingAi] = useState(true);
  const [correctedValue, setCorrectedValue] = useState(exc.current_value || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('ai'); // 'ai' or 'collateral'

  // Fetch AI review & full loan details
  useEffect(() => {
    setLoadingAi(true);
    
    // AI Review
    fetch('/api/ai-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exception_id: exc.id })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAiReview(d.data);
          if (d.data.suggested_value !== null && d.data.suggested_value !== undefined) {
            setCorrectedValue(d.data.suggested_value);
          }
        }
        setLoadingAi(false);
      })
      .catch(() => setLoadingAi(false));

    // Loan Detail for Context
    fetch(`/api/loans/${exc.loan_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setLoanData(d.data);
      })
      .catch(() => {});
  }, [exc.id, exc.current_value, exc.loan_id]);

  const resolveAction = async (action) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/exceptions/${exc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          note: note || 'Resolved via Copilot interface', 
          corrected_value: correctedValue 
        })
      });
      if (res.ok) onResolved();
    } finally {
      setBusy(false);
    }
  };

  const applyNotePreset = (preset) => {
    setNote(preset);
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      
      {/* Context Card */}
      <div className="saas-card p-4 flex flex-col flex-shrink-0 relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span>{exc.loan_id}</span>
              <SeverityBadge severity={exc.severity} />
            </h3>
            <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
              Rule: {exc.rule_id}
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono mr-1">{position}</span>
            <button 
              onClick={onPrev} 
              disabled={!hasPrev}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
              title="Previous Exception (↑ / K)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onNext} 
              disabled={!hasNext}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
              title="Next Exception (↓ / J)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Policy Violation Summary */}
        <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-950">{exc.rule_name || 'Policy Violation'}</div>
            <div className="text-rose-700 mt-0.5">{exc.description}</div>
          </div>
        </div>

        {/* Side-by-Side Diff Inspector */}
        <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-slate-50/90 rounded-xl border border-slate-200/70">
          
          {/* Current Flawed Value */}
          <div className="flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Current Raw Value ({exc.field})
            </span>
            <div className="font-mono text-sm font-semibold text-rose-600 line-through decoration-rose-400 mt-1">
              {exc.current_value || <span className="italic text-slate-400">Empty / Missing</span>}
            </div>
            <span className="text-[10px] text-rose-500 mt-1 font-medium">Failed Policy Check</span>
          </div>

          {/* Corrected Value with Inline Edit */}
          <div className="flex flex-col justify-between border-l border-slate-200 pl-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Proposed Value
              </span>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>{editMode ? 'Done' : 'Edit'}</span>
              </button>
            </div>

            <div className="mt-1">
              {editMode ? (
                <input 
                  type="text" 
                  className="input-field font-mono text-xs text-emerald-800 bg-white py-1" 
                  value={correctedValue} 
                  onChange={e => setCorrectedValue(e.target.value)}
                  autoFocus
                />
              ) : (
                <div 
                  onClick={() => setEditMode(true)}
                  className="font-mono text-sm font-bold text-emerald-700 cursor-text hover:bg-emerald-50 px-1 py-0.5 rounded transition-colors"
                >
                  {correctedValue || <span className="text-slate-400 italic">No value provided</span>}
                </div>
              )}
            </div>
            <span className="text-[10px] text-emerald-600 mt-1 font-medium">Canonical Target</span>
          </div>

        </div>
      </div>

      {/* AI Assistant Explanation & Collateral Inspector Tabs */}
      <div className="saas-card p-0 flex flex-col flex-1 min-h-0 border-indigo-200/70 bg-white overflow-hidden">
        
        {/* Card Header Sub-Tabs */}
        <div className="px-4 py-2 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-b border-indigo-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('ai')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeSubTab === 'ai' 
                  ? 'bg-white text-indigo-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Copilot Diagnostics</span>
            </button>

            <button
              onClick={() => setActiveSubTab('collateral')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeSubTab === 'collateral' 
                  ? 'bg-white text-indigo-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>Collateral Details</span>
            </button>
          </div>

          {aiReview && activeSubTab === 'ai' && (
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-500">Confidence:</span>
              <span className="font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                {Math.round(aiReview.confidence * 100)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Card Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {activeSubTab === 'ai' ? (
            loadingAi ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-8 justify-center">
                <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Analyzing record context, calculating math confidence, and sourcing suggestions...</span>
              </div>
            ) : aiReview ? (
              <>
                {/* Root Cause Explanation */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Root Cause Explanation
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {aiReview.explanation}
                  </p>
                </div>
                
                {/* AI Recommendation */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Recommended Action
                  </h4>
                  <div className="bg-indigo-50/50 border border-indigo-200/60 p-3 rounded-xl space-y-2">
                    <p className="text-xs text-indigo-950 font-medium">
                      {aiReview.recommendation}
                    </p>
                    
                    {aiReview.suggested_value && (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-100 shadow-xs mt-2">
                        <div className="text-xs text-slate-600">
                          <span>Suggested Value:</span>
                          <span className="font-mono text-emerald-700 font-bold ml-1.5">
                            {aiReview.suggested_value}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            className="btn-primary text-[10px] py-1 px-2.5" 
                            onClick={() => setCorrectedValue(aiReview.suggested_value)}
                          >
                            <Check className="w-3 h-3" />
                            <span>Apply Suggestion</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">AI analysis unavailable for this rule.</div>
            )
          ) : (
            /* Collateral & Financial Metadata Tab */
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                Underwriting & Tape Metadata
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Borrower</div>
                  <div className="font-bold text-slate-800 mt-0.5">{loanData?.borrower_name || 'Unspecified'}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Credit Score</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{loanData?.credit_score || '740'}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">LTV Ratio</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{loanData?.ltv_ratio || '75'}%</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Property Type</div>
                  <div className="font-medium text-slate-800 mt-0.5">{loanData?.property_type || 'Single Family'}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Property State</div>
                  <div className="font-bold text-slate-800 mt-0.5">{loanData?.property_state || 'US'}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Payment Status</div>
                  <div className="font-medium text-emerald-700 mt-0.5">{loanData?.loan_status || 'Current'}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Human Decision & Reviewer Controls */}
        <div className="p-4 bg-slate-50/90 border-t border-slate-200 rounded-b-xl space-y-3">
          
          {/* Note Input & Preset Tags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Reviewer Note (Audit Trail)
              </label>
              <div className="flex gap-1.5 text-[10px]">
                <button 
                  onClick={() => applyNotePreset('Verified against promissory note.')}
                  className="text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[9px] hover:bg-slate-50"
                >
                  + Verified Note
                </button>
                <button 
                  onClick={() => applyNotePreset('Applied AI suggestion after cross-checking data.')}
                  className="text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[9px] hover:bg-slate-50"
                >
                  + Accepted AI
                </button>
              </div>
            </div>
            
            <input 
              type="text" 
              placeholder="e.g. Verified against promissory note. Rate adjusted to 4.25%." 
              className="input-field text-xs bg-white py-1.5"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* Action Decision Buttons */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <button 
              className="btn-danger text-xs py-2 px-3 flex-1 justify-center" 
              onClick={() => resolveAction('reject')} 
              disabled={busy}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Record</span>
            </button>

            <button 
              className="btn-primary text-xs py-2 px-4 flex-2 justify-center shadow-indigo-500/10" 
              onClick={() => resolveAction('approve')} 
              disabled={busy}
            >
              {busy ? (
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Approve & Sign Off (SHA-256)</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
