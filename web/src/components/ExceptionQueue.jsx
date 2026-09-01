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
  const [statusFilter, setStatusFilter] = useState('open'); // 'open', 'resolved', 'all'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toast = useToast();

  const fetchExceptions = useCallback(() => {
    const token = localStorage.getItem('loanguard_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/exceptions?status=${statusFilter}`, { headers: authHeaders })
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
  }, [statusFilter]);

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

  const [page, setPage] = useState(1);
  const pageSize = 25;

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, severityFilter, ruleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredExceptions.length / pageSize) || 1;
  const paginatedExceptions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExceptions.slice(start, start + pageSize);
  }, [filteredExceptions, page, pageSize]);

  const currentIndex = selectedExc ? filteredExceptions.findIndex(e => e.id === selectedExc.id) : -1;
  
  const handleNext = useCallback(() => {
    if (currentIndex < filteredExceptions.length - 1) {
      const nextExc = filteredExceptions[currentIndex + 1];
      setSelectedExc(nextExc);
      const targetPage = Math.floor((currentIndex + 1) / pageSize) + 1;
      if (targetPage !== page) setPage(targetPage);
    }
  }, [currentIndex, filteredExceptions, page, pageSize]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevExc = filteredExceptions[currentIndex - 1];
      setSelectedExc(prevExc);
      const targetPage = Math.floor((currentIndex - 1) / pageSize) + 1;
      if (targetPage !== page) setPage(targetPage);
    }
  }, [currentIndex, filteredExceptions, page, pageSize]);

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
    if (selectedIds.size === paginatedExceptions.length && paginatedExceptions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedExceptions.map(e => e.id)));
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

  // Bulk Resolution
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-emerald-600"></div>
          <span>Loading exception queue & policy engine state...</span>
        </div>
      </div>
    );
  }

  const isAllSelected = paginatedExceptions.length > 0 && selectedIds.size === paginatedExceptions.length;

  return (
    <div className="flex h-full gap-6 relative">
      
      {/* Left Pane: Queue List */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedExc ? 'hidden lg:flex lg:w-[40%]' : 'w-full'}`}>
        
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Exception Review Queue</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {exceptions.length} {statusFilter === 'open' ? 'Pending Review' : statusFilter === 'resolved' ? 'Resolved' : 'Total'}
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

        {/* Status Filter Tabs (Pending, Resolved, All) */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {[
            { id: 'open', label: 'Pending Review' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'all', label: 'All Statuses' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st.id 
                  ? 'bg-emerald-700 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
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
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl !pl-9.5 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
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
            className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1.5 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            title="Generate AI Cluster Diagnostics Summary"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">✦ AI Batch Summary</span>
          </button>
        </div>

        {/* Bulk Action Bar when items selected */}
        {selectedIds.size > 0 && (
          <div className="mb-3 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>{selectedIds.size} exceptions selected</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleBulkResolve('reject')}
                disabled={bulkBusy}
                className="btn-danger text-[11px] py-1 px-2.5"
              >
                Bulk Reject
              </button>
              <button
                onClick={() => handleBulkResolve('approve')}
                disabled={bulkBusy}
                className="btn-primary text-[11px] py-1 px-3 shadow-emerald-500/10"
              >
                {bulkBusy ? 'Resolving...' : 'Bulk Approve (SHA-256)'}
              </button>
            </div>
          </div>
        )}

        {/* Queue Table */}
        <div className="flex-1 overflow-auto saas-card p-0">
          <table className="w-full text-left border-collapse">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <button 
                    onClick={toggleSelectAll} 
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={isAllSelected ? "Deselect all" : "Select all on page"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5">Loan Identifier</th>
                <th className="px-3 py-2.5">Policy Rule</th>
                <th className="px-3 py-2.5">Field</th>
                <th className="px-3 py-2.5 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExceptions.map(exc => {
                const isSelected = selectedExc && selectedExc.id === exc.id;
                const isChecked = selectedIds.has(exc.id);
                return (
                  <tr
                    key={exc.id}
                    onClick={() => setSelectedExc(exc)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                      isSelected ? 'bg-emerald-50/60 font-medium' : ''
                    }`}
                  >
                    <td className="table-cell px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => toggleSelectOne(exc.id, e)} 
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    <td className="table-cell px-3 py-2.5">
                      <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {exc.loan_id}
                      </div>
                    </td>

                    <td className="table-cell px-3 py-2.5">
                      <div className="font-semibold text-slate-800 text-xs truncate max-w-[140px]">{exc.rule_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{exc.rule_id}</div>
                    </td>

                    <td className="table-cell px-3 py-2.5">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {exc.field}
                      </span>
                    </td>

                    <td className="table-cell px-3 py-2.5 text-right">
                      <SeverityBadge severity={exc.severity} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({filteredExceptions.length} items)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Right Pane: Reviewer Workbench Inspector */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedExc ? 'flex flex-col h-full' : 'hidden lg:flex lg:flex-col lg:items-center lg:justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200'}`}>
        {selectedExc ? (
          <ReviewerWorkbench 
            key={selectedExc.id}
            exc={selectedExc}
            onResolved={() => {
              toast.success("Exception Handled", `Loan ${selectedExc.loan_id} resolution committed.`);
              fetchExceptions();
            }}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={currentIndex < filteredExceptions.length - 1}
            hasPrev={currentIndex > 0}
            position={`${currentIndex + 1} of ${filteredExceptions.length}`}
          />
        ) : (
          <div className="text-center p-8 space-y-2 text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Select an exception to inspect</p>
            <p className="text-xs">AI Copilot will generate diagnostic insights and remediation options.</p>
          </div>
        )}
      </div>

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
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
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
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                    <span>Synthesizing exception clusters...</span>
                  </div>
                ) : batchAiData ? (
                  <>
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
                      <div className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
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
  
  // Decoupled 3-state value model: human draft value is null until human action
  const [draftValue, setDraftValue] = useState(null);
  const [appliedFromAi, setAppliedFromAi] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('ai'); // 'ai' or 'collateral'
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  // Fetch AI review & full loan details smoothly
  useEffect(() => {
    setSuggestionApplied(false);
    setDraftValue(null);
    setAppliedFromAi(false);
    setEditMode(false);

    if (globalAiCache.has(exc.id)) {
      const cached = globalAiCache.get(exc.id);
      setAiReview(cached);
      setLoadingAi(false);
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
  }, [exc.id, exc.current_value, exc.loan_id]);

  const handleApplySuggestion = (val) => {
    if (val === null || val === undefined) return;
    setDraftValue(val);
    setAppliedFromAi(true);
    setNote(`Applied AI recommended value (${val}) per validation rule.`);
    setSuggestionApplied(true);
    setTimeout(() => setSuggestionApplied(false), 2500);
  };

  const handleResetDraft = () => {
    setDraftValue(null);
    setAppliedFromAi(false);
    setEditMode(false);
  };

  const resolveAction = async (action) => {
    setBusy(true);
    try {
      const finalValueToSend = draftValue !== null ? draftValue : (exc.suggested_value || exc.current_value);
      const token = localStorage.getItem('loanguard_token');
      const res = await fetch(`/api/exceptions/${exc.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          action, 
          note: note || (action === 'approve' ? 'Approved & verified by reviewer' : 'Rejected record due to policy violation'), 
          corrected_value: finalValueToSend 
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
    <div className="saas-card p-0 flex flex-col h-full max-h-full overflow-hidden border-slate-200/80 shadow-md bg-white">
      
      {/* 1. Header Bar */}
      <div className="px-5 py-3 border-b border-slate-200/80 bg-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 font-mono">{exc.loan_id}</h3>
            <SeverityBadge severity={exc.severity} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono mr-1">{position}</span>
            <button 
              onClick={onPrev} 
              disabled={!hasPrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Previous Exception"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onNext} 
              disabled={!hasNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Next Exception"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-mono font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">{exc.rule_id}</span>
          <span className="text-slate-300">·</span>
          <span>{exc.rule_name || 'Policy Violation'}</span>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
        
        {/* Validation Failure */}
        <div className="p-3.5 bg-rose-50/80 border border-rose-200/70 rounded-xl text-xs text-rose-900 flex items-start gap-3">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-950">WHY THIS FAILED</div>
            <div className="text-rose-700 mt-0.5 leading-relaxed">{exc.description}</div>
          </div>
        </div>

        {/* Structured Non-Overlapping Three-State Diff Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/70">
          
          {/* 1. Source Value */}
          <div className="flex flex-col justify-between min-w-0 bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              1. Source Value ({exc.field})
            </span>
            <div className="font-mono text-xs font-semibold text-rose-600 line-through decoration-rose-400 my-1 truncate" title={exc.current_value || 'Empty / Missing'}>
              {exc.current_value || <span className="italic text-slate-400 font-normal">Empty / Missing</span>}
            </div>
            <span className="text-[10px] text-rose-500 font-medium">Failed check</span>
          </div>

          {/* 2. AI Recommendation */}
          <div className="flex flex-col justify-between min-w-0 bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>2. AI Suggestion</span>
              {suggestionApplied && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">✓ Loaded</span>}
            </span>
            <div className="font-mono text-xs font-bold text-emerald-700 my-1 truncate" title={aiReview?.suggested_value || 'Manual review required'}>
              {aiReview?.suggested_value || <span className="text-slate-400 italic font-normal text-[11px]">Manual review required</span>}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Candidate draft</span>
          </div>

          {/* 3. Final Human Value */}
          <div className={`flex flex-col justify-between min-w-0 bg-white p-2.5 rounded-lg border transition-all shadow-2xs ${draftValue !== null ? 'border-emerald-300 ring-1 ring-emerald-500/20' : 'border-slate-200/60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                3. Final Human Value
              </span>
              <div className="flex items-center gap-1">
                {draftValue !== null && (
                  <button 
                    onClick={handleResetDraft}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                    title="Reset to pending"
                  >
                    Reset
                  </button>
                )}
                <button 
                  onClick={() => setEditMode(!editMode)}
                  className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{editMode ? 'Done' : 'Edit'}</span>
                </button>
              </div>
            </div>

            <div className="my-1 min-w-0">
              {editMode ? (
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-emerald-400 rounded px-2 py-0.5 font-mono text-xs text-slate-900 focus:outline-none" 
                  value={draftValue !== null ? draftValue : (exc.current_value || '')} 
                  onChange={e => { setDraftValue(e.target.value); setAppliedFromAi(false); }}
                  autoFocus
                />
              ) : (
                <div 
                  onClick={() => setEditMode(true)}
                  className="font-mono text-xs font-bold cursor-text truncate"
                  title={draftValue !== null ? draftValue : 'Pending reviewer decision'}
                >
                  {draftValue !== null ? (
                    <span className="text-slate-900">{draftValue}</span>
                  ) : (
                    <span className="text-slate-400 italic font-normal text-[11px]">Pending reviewer decision</span>
                  )}
                </div>
              )}
            </div>

            <span className="text-[10px] font-medium truncate">
              {draftValue !== null ? (
                <span className="text-emerald-700 font-semibold">✓ {appliedFromAi ? 'Accepted AI Suggestion' : 'Human Override'}</span>
              ) : (
                <span className="text-amber-600">⚠ Requires confirmation</span>
              )}
            </span>
          </div>

        </div>

        {/* AI Diagnostics & Collateral Sub-Tabs Card */}
        <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
          <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSubTab('ai')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'ai' 
                    ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Diagnostics Copilot</span>
              </button>

              <button
                onClick={() => setActiveSubTab('collateral')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'collateral' 
                    ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Collateral Details</span>
              </button>
            </div>

            {aiReview && activeSubTab === 'ai' && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono" title="Model confidence in proposed recommendation">
                <span className="text-slate-500">Confidence:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {Math.round(aiReview.confidence * 100)}%
                </span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3.5">
            {activeSubTab === 'ai' ? (
              loadingAi ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-6 justify-center">
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
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
                    <div className="bg-emerald-50/50 border border-emerald-200/70 p-3 rounded-xl space-y-2.5">
                      <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                        {aiReview.recommendation}
                      </p>
                      
                      {aiReview.suggested_value && (
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                          <div className="text-xs text-slate-700 min-w-0 pr-2">
                            <span className="text-slate-500">Suggested Value:</span>
                            <span className="font-mono text-emerald-700 font-bold ml-1.5 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate inline-block max-w-[180px] align-middle">
                              {aiReview.suggested_value}
                            </span>
                          </div>
                          <button 
                            className={`text-[10px] py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              suggestionApplied 
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' 
                                : 'btn-primary'
                            }`} 
                            onClick={() => handleApplySuggestion(aiReview.suggested_value)}
                          >
                            {suggestionApplied ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                                <span>Applied to Draft!</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Apply to Draft</span>
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
      <div className="p-4 bg-slate-50/95 border-t border-slate-200 shrink-0 space-y-2.5">
        {/* Note Input & Presets */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Reviewer Note (Audit Trail)
            </label>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <button 
                onClick={() => applyNotePreset('Verified against promissory note.')}
                className="text-emerald-800 hover:text-emerald-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] hover:border-emerald-300 hover:bg-emerald-50/50 font-medium cursor-pointer transition-colors"
                title="Preset note for note verification"
              >
                + Note Verified
              </button>
              <button 
                onClick={() => applyNotePreset('Applied AI suggestion after cross-checking data.')}
                className="text-emerald-800 hover:text-emerald-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] hover:border-emerald-300 hover:bg-emerald-50/50 font-medium cursor-pointer transition-colors"
                title="Preset note for AI acceptance"
              >
                + Accepted AI
              </button>
              <button 
                onClick={() => applyNotePreset('Reconciled against servicer month-end tape.')}
                className="text-emerald-800 hover:text-emerald-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] hover:border-emerald-300 hover:bg-emerald-50/50 font-medium cursor-pointer transition-colors"
                title="Preset note for servicer match"
              >
                + Servicer Match
              </button>
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="e.g. Verified against promissory note. Rate adjusted to 4.25%." 
            className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all shadow-2xs"
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
            className="btn-primary text-xs py-2.5 px-4 flex-2 justify-center shadow-emerald-500/15 cursor-pointer disabled:opacity-50" 
            onClick={() => resolveAction('approve')} 
            disabled={busy}
          >
            {busy ? (
              <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Approve & Verify</span>
          </button>
        </div>
        <div className="text-center text-[9px] text-slate-400 -mt-1">SHA-256 integrity record generated on approval</div>
      </div>

    </div>
  );
}
