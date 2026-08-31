import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    const token = localStorage.getItem('loanguard_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/exceptions', { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d && d.success && Array.isArray(d.data)) {
          setSelectedExc(prev => {
            if (prev) {
              const stillOpen = d.data.find(e => e.id === prev.id);
              return stillOpen || (d.data.length > 0 ? d.data[0] : null);
            } else if (d.data.length > 0) {
              return d.data[0];
            }
            return null;
          });
          setExceptions(d.data);
        } else {
          setExceptions([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const [showBatchAiModal, setShowBatchAiModal] = useState(false);
  const [batchAiData, setBatchAiData] = useState(null);
  const [batchAiLoading, setBatchAiLoading] = useState(false);

  // AI Batch Summary
  const fetchBatchAiSummary = async () => {
    setBatchAiLoading(true);
    setShowBatchAiModal(true);
    try {
      const token = localStorage.getItem('loanguard_token');
      const res = await fetch('/api/ai/batch-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setBatchAiData(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBatchAiLoading(false);
    }
  };

  // Bulk Resolution using dedicated batch endpoint
  const handleBulkResolve = async (action = 'approve') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selectedIds);

    try {
      const token = localStorage.getItem('loanguard_token');
      const res = await fetch('/api/exceptions/batch-resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          exception_ids: ids,
          action: action === 'approve' ? 'resolve' : 'reject',
          note: `Bulk ${action} executed via Exception Reviewer workbench`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Batch Operation Completed", `Successfully resolved ${data.count} exceptions in batch.`);
        setSelectedIds(new Set());
        fetchExceptions();
      } else {
        toast.error("Batch Failed", data.error || 'Failed to process batch');
      }
    } catch (err) {
      console.error("Bulk resolve error:", err);
      toast.error("Batch Error", err.message);
    } finally {
      setBulkBusy(false);
    }
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Search ID, Rule, Field or Violation..." 
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl !pl-9.5 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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

          <button
            onClick={fetchBatchAiSummary}
            className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            title="Generate AI Cluster Diagnostics Summary"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">AI Summary</span>
          </button>
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
                            ? 'bg-indigo-50/80 border-l-[3px] border-l-indigo-600' 
                            : 'hover:bg-slate-50/80 border-l-[3px] border-l-transparent'
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

      {/* AI Batch Diagnostics Modal */}
      <AnimatePresence>
        {showBatchAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">AI Cluster Diagnostics Summary</h3>
                    <p className="text-xs text-slate-500">Portfolio-wide exception analysis & remediation recommendations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBatchAiModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                {batchAiLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Synthesizing exception clusters...</span>
                  </div>
                ) : batchAiData ? (
                  <>
                    <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
                      <div className="font-semibold text-indigo-900 mb-1 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        Executive Copilot Briefing
                      </div>
                      {batchAiData.ai_summary}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cluster Breakdown</h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {batchAiData.cluster_breakdown?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">{item.rule_id}</span>
                              <span className="text-slate-600">({item.rule_name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={item.severity} />
                              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {item.count} loans
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Suggested Action: </span>
                      {batchAiData.suggested_batch_action}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No batch diagnostics data available.</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setShowBatchAiModal(false)}
                  className="btn-secondary text-xs py-1.5 px-4"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
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

const globalAiCache = new Map();

function ReviewerWorkbench({ exc, onResolved, onNext, onPrev, hasNext, hasPrev, position }) {
  const [aiReview, setAiReview] = useState(() => globalAiCache.get(exc.id) || null);
  const [loanData, setLoanData] = useState(null);
  const [loadingAi, setLoadingAi] = useState(() => !globalAiCache.has(exc.id));
  const [correctedValue, setCorrectedValue] = useState(exc.suggested_value || exc.current_value || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('ai'); // 'ai' or 'collateral'
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  // Fetch AI review & full loan details smoothly
  useEffect(() => {
    setSuggestionApplied(false);
    setCorrectedValue(exc.suggested_value || exc.current_value || '');
    setEditMode(false);

    if (globalAiCache.has(exc.id)) {
      const cached = globalAiCache.get(exc.id);
      setAiReview(cached);
      setLoadingAi(false);
      if (cached.suggested_value !== null && cached.suggested_value !== undefined) {
        setCorrectedValue(cached.suggested_value);
      }
    } else {
      setLoadingAi(true);
      const token = localStorage.getItem('loanguard_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      
      // AI Review
      fetch('/api/ai-review', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ exception_id: exc.id })
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            globalAiCache.set(exc.id, d.data);
            setAiReview(d.data);
            if (d.data.suggested_value !== null && d.data.suggested_value !== undefined) {
              setCorrectedValue(d.data.suggested_value);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAi(false));
    }

    // Loan Detail for Context
    const token = localStorage.getItem('loanguard_token');
    fetch(`/api/loans/${exc.loan_id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setLoanData(d.data);
      })
      .catch(() => {});
  }, [exc.id, exc.current_value, exc.loan_id, exc.suggested_value]);

  const handleApplySuggestion = (val) => {
    if (val === null || val === undefined) return;
    setCorrectedValue(val);
    setNote(`Applied AI recommended value (${val}) per validation rule.`);
    setSuggestionApplied(true);
    setTimeout(() => setSuggestionApplied(false), 2500);
  };

  const resolveAction = async (action) => {
    setBusy(true);
    try {
      const token = localStorage.getItem('loanguard_token');
      const res = await fetch(`/api/exceptions/${exc.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          action, 
          note: note || 'Resolved via Copilot interface', 
          corrected_value: correctedValue 
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onResolved();
      } else {
        toast.error("Resolution Failed", data.error || 'Failed to update exception');
      }
    } catch (e) {
      toast.error("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const applyNotePreset = (preset) => {
    setNote(preset);
  };

  return (
    <div className="saas-card p-0 flex flex-col h-full overflow-hidden border-slate-200/80 shadow-md bg-white">
      
      {/* 1. Header Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
            <span>{exc.loan_id}</span>
            <SeverityBadge severity={exc.severity} />
          </h3>
          <span className="text-[11px] font-mono text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/60">
            Rule: {exc.rule_id}
          </span>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-mono mr-1">{position}</span>
          <button 
            onClick={onPrev} 
            disabled={!hasPrev}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
            title="Previous Exception (↑ / K)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={onNext} 
            disabled={!hasNext}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
            title="Next Exception (↓ / J)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        
        {/* Policy Violation Summary */}
        <div className="p-3.5 bg-rose-50/80 border border-rose-200/70 rounded-xl text-xs text-rose-900 flex items-start gap-3">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-950">{exc.rule_name || 'Policy Violation'}</div>
            <div className="text-rose-700 mt-0.5 leading-relaxed">{exc.description}</div>
          </div>
        </div>

        {/* Side-by-Side Diff Inspector */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/70">
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
          <div className={`flex flex-col justify-between border-l border-slate-200/80 pl-3.5 transition-colors duration-200 ${suggestionApplied ? 'bg-emerald-50/80 rounded-r-lg' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>Proposed Value</span>
                {suggestionApplied && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">✓ Applied</span>}
              </span>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
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

        {/* AI Diagnostics & Collateral Sub-Tabs Card */}
        <div className="rounded-xl border border-indigo-200/80 overflow-hidden bg-white shadow-2xs">
          <div className="px-3.5 py-2 bg-gradient-to-r from-indigo-50/90 to-purple-50/60 border-b border-indigo-100 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSubTab('ai')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
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
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-slate-500">Confidence:</span>
                <span className="font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-full border border-indigo-200">
                  {Math.round(aiReview.confidence * 100)}%
                </span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3.5">
            {activeSubTab === 'ai' ? (
              loadingAi ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-6 justify-center">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>Analyzing policy violation & calculating remediation...</span>
                </div>
              ) : aiReview ? (
                <>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                      Root Cause Explanation
                    </h4>
                    <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {aiReview.explanation}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                      Recommended Action
                    </h4>
                    <div className="bg-indigo-50/60 border border-indigo-200/70 p-3 rounded-xl space-y-2.5">
                      <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                        {aiReview.recommendation}
                      </p>
                      
                      {aiReview.suggested_value && (
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
                          <div className="text-xs text-slate-700">
                            <span className="text-slate-500">Suggested Value:</span>
                            <span className="font-mono text-emerald-700 font-bold ml-1.5 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {aiReview.suggested_value}
                            </span>
                          </div>
                          <button 
                            className={`text-[10px] py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              suggestionApplied 
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' 
                                : 'btn-primary'
                            }`} 
                            onClick={() => handleApplySuggestion(aiReview.suggested_value)}
                          >
                            {suggestionApplied ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                                <span>Applied!</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Apply Suggestion</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500 py-3">AI analysis unavailable for this rule.</div>
              )
            ) : (
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
        </div>

      </div>

      {/* 3. Sticky Action Footer */}
      <div className="p-4 bg-slate-50/95 border-t border-slate-200/90 shrink-0 space-y-3">
        {/* Note Input & Presets */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Reviewer Note (Audit Trail)
            </label>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <button 
                onClick={() => applyNotePreset('Verified against promissory note.')}
                className="text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] hover:bg-slate-50 font-medium cursor-pointer"
                title="Preset note for note verification"
              >
                + Note Verified
              </button>
              <button 
                onClick={() => applyNotePreset('Applied AI suggestion after cross-checking data.')}
                className="text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] hover:bg-slate-50 font-medium cursor-pointer"
                title="Preset note for AI acceptance"
              >
                + Accepted AI
              </button>
              <button 
                onClick={() => applyNotePreset('Reconciled against servicer month-end tape.')}
                className="text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] hover:bg-slate-50 font-medium cursor-pointer"
                title="Preset note for servicer match"
              >
                + Servicer Match
              </button>
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="e.g. Verified against promissory note. Rate adjusted to 4.25%." 
            className="input-field text-xs bg-white py-2"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* Action Decision Buttons */}
        <div className="flex items-center justify-between gap-2.5">
          <button 
            className="btn-danger text-xs py-2.5 px-3.5 flex-1 justify-center cursor-pointer" 
            onClick={() => resolveAction('reject')} 
            disabled={busy}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject Record</span>
          </button>

          <button 
            className="btn-primary text-xs py-2.5 px-4 flex-2 justify-center shadow-indigo-500/15 cursor-pointer" 
            onClick={() => resolveAction('approve')} 
            disabled={busy}
          >
            {busy ? (
              <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Approve & Sign Off (SHA-256)</span>
          </button>
        </div>
      </div>

    </div>
  );
}
