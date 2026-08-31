import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  ArrowUpRight, 
  Database, 
  Trash2, 
  Copy,
  Check,
  Search,
  RefreshCw,
  FileCheck,
  Zap,
  X
} from 'lucide-react';
import { useToast } from '../ToastContext.jsx';
import { ExceptionSeverityChart } from './Charts.jsx';

export default function OperatorView() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedBatch, setCopiedBatch] = useState(null);
  const fileInput = useRef(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('loanguard_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [sumRes, histRes] = await Promise.all([
        fetch('/api/summary', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/uploads', { headers: authHeaders }).then(r => r.json())
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (histRes.success) setHistory(histRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchData() }, [fetchData]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setResult(null);
  };

  const handleUpload = async (customFile = null) => {
    const targetFile = customFile || file;
    if (!targetFile) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', targetFile);

    try {
      const token = localStorage.getItem('loanguard_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/upload', { 
        method: 'POST', 
        headers,
        body: formData 
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        fetchData();
        window.dispatchEvent(new Event('upload_success'));
        toast.success("Ingestion Completed", `Processed ${data.recordsProcessed} loans (${data.validCount} valid, ${data.exceptionCount} exceptions).`);
      } else {
        setResult({ error: data.error || 'Upload failed' });
        toast.error("Upload Rejected", data.error || 'Validation failed');
      }
    } catch (err) {
      setResult({ error: err.message });
      toast.error("Upload Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Quick Preset Loan Tape Loaders
  const loadPreset = async (type) => {
    let csvContent = '';
    let fileName = '';
    const tag = Math.random().toString(36).substring(2, 6);

    if (type === 'clean') {
      fileName = `clean_tape_${tag}.csv`;
      csvContent = [
        'loan_id,borrower_name,origination_date,maturity_date,principal_balance,current_balance,interest_rate,monthly_payment,loan_status,property_type,property_state,ltv_ratio,credit_score,zip_code',
        `LN-CLN01_${tag},Sarah Jenkins,01/15/2022,01/15/2052,350000,340000,4.25,1721.88,Current,Single Family,CA,75,760,94102`,
        `LN-CLN02_${tag},Marcus Chen,03/20/2021,03/20/2051,480000,460000,3.75,2223.11,Current,Condo,WA,80,780,98101`,
        `LN-CLN03_${tag},Elena Rostova,06/10/2023,06/10/2053,275000,270000,5.50,1561.41,Current,Townhouse,TX,70,720,77002`,
        `LN-CLN04_${tag},David Miller,11/05/2020,11/05/2050,620000,580000,3.25,2698.40,Current,Single Family,NY,65,810,10024`,
      ].join('\n');
    } else if (type === 'adversarial') {
      fileName = `adversarial_tape_${tag}.csv`;
      csvContent = [
        'loan_id,borrower_name,origination_date,maturity_date,principal_balance,current_balance,interest_rate,monthly_payment,loan_status,property_type,property_state,ltv_ratio,credit_score,zip_code',
        `LN-ADV01_${tag},Negative Balance Bob,01/01/2020,01/01/2050,-250000,95000,4.0,500,Current,Condo,CA,80,700,90210`,
        `LN-ADV02_${tag},Neg Rate Rita,01/01/2020,01/01/2050,100000,95000,-3.5,500,Current,Condo,CA,80,700,90210`,
        `LN-ADV03_${tag},High Rate Harry,01/01/2020,01/01/2050,100000,95000,42.0,500,Current,Condo,CA,80,700,90210`,
        `LN-ADV04_${tag},,01/01/2020,01/01/2050,100000,95000,4.0,500,Current,Condo,CA,80,700,90210`,
        `LN-ADV05_${tag},Bad Date Dave,01/01/2025,01/01/2020,100000,95000,4.0,500,Current,Condo,CA,80,700,90210`,
        `LN-ADV06_${tag},Bad State Stan,01/01/2020,01/01/2050,100000,95000,4.0,500,Current,Condo,california,80,700,90210`,
      ].join('\n');
    } else if (type === 'large_messy') {
      fileName = `large_messy_tape_3000_${tag}.csv`;
      try {
        const res = await fetch('/large_messy_loan_tape.csv');
        csvContent = await res.text();
      } catch {
        csvContent = 'loan_id,borrower_name,origination_date,maturity_date,principal_balance,current_balance,interest_rate,monthly_payment,loan_status,property_type,property_state,ltv_ratio,credit_score,zip_code\n';
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const fakeFile = new File([blob], fileName, { type: 'text/csv' });
    setFile(fakeFile);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedBatch(id);
    setTimeout(() => setCopiedBatch(null), 2000);
  };

  const filteredHistory = history.filter(b => 
    b.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header with Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Loan Ingestion & Quality Hub</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Active Session: Operator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload raw loan tapes, execute real-time policy engine validation, and monitor portfolio data quality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            className="btn-secondary text-xs py-1.5 px-3"
            title="Refresh Ingestion Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Enterprise KPI Metrics Bar */}
      {loadingData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="saas-card p-4 flex flex-col justify-between h-28 bg-slate-50/70 border-slate-200">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-slate-200 rounded-md"></div>
                <div className="h-7 w-7 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="space-y-2 mt-2">
                <div className="h-6 w-16 bg-slate-200 rounded-md"></div>
                <div className="h-2 w-full bg-slate-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Quality Score */}
          <div className="saas-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quality Score</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${summary.data_quality_score > 90 ? 'text-emerald-600' : summary.data_quality_score > 70 ? 'text-amber-500' : 'text-rose-600'}`}>
                  {summary.data_quality_score}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Compliance Rate</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${summary.data_quality_score > 90 ? 'bg-emerald-500' : summary.data_quality_score > 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${summary.data_quality_score}%` }}
                />
              </div>
            </div>
          </div>

          <div className="saas-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Ingested</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <Database className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {summary.total_loans?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Raw Records</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>{summary.uploads_count || 0}</span> batches processed
              </p>
            </div>
          </div>

          <div className="saas-card p-4 flex flex-col justify-between border-emerald-200/60 bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Clean & Valid</span>
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">
                  {(summary.valid_loans + summary.verified_loans)?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] text-emerald-600/80 font-medium">Compliant</span>
              </div>
            </div>
          </div>

          <div className="saas-card p-4 flex flex-col justify-between border-amber-200/60 bg-amber-50/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Open Exceptions</span>
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-800">
                  {summary.open_exceptions?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] text-amber-700/80 font-medium">Anomalies</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="saas-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>Ingest Loan Tape</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">CSV format</span>
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center relative ${
                file 
                  ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/10' 
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInput.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInput} 
                onChange={handleFileSelect} 
                accept=".csv,text/csv" 
                className="hidden" 
              />
              
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 mb-3 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              
              {file ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{file.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">
                    <span className="text-emerald-700 font-bold hover:underline">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-[10px] text-slate-400">Institutional Securitization Tape (.CSV)</div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button 
                onClick={() => handleUpload()} 
                disabled={!file || uploading} 
                className="btn-primary flex-1 text-xs py-2.5 shadow-sm shadow-emerald-600/20"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing & Ingesting Tape...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Run Securitization Pipeline</span>
                  </>
                )}
              </button>
              
              {file && !uploading && (
                <button 
                  onClick={() => setFile(null)} 
                  className="btn-secondary text-xs py-2.5 px-3 text-slate-500 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {uploading && (
              <div className="mt-3 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Executing 12 Statutory Policy Rules in Memory...</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full w-full rounded-full animate-pulse"
                  />
                </div>
              </div>
            )}

            {result && result.success && (
              <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ingestion Completed Successfully</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Ready for reviewer triage:</span>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('switch_tab', { detail: 'reviewer' }));
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-white border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span>Review Exceptions ({result.exceptionCount})</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
              </div>
            )}
          </div>

          <div className="saas-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Quick Test Datasets
              </span>
              <button 
                onClick={() => setShowPolicyModal(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Policy Rules (12)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button 
                onClick={() => loadPreset('clean')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group hover:border-emerald-300"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 text-[11px]">Clean Tape</div>
                  <div className="text-[10px] text-slate-400">100% compliant</div>
                </div>
              </button>

              <button 
                onClick={() => loadPreset('adversarial')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group hover:border-amber-300"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 text-[11px]">Adversarial</div>
                  <div className="text-[10px] text-slate-400">6 Multi-errors</div>
                </div>
              </button>

              <button 
                onClick={() => loadPreset('large_messy')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
              >
                <Database className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-emerald-950 text-[11px]">Large 3k Tape</div>
                  <div className="text-[10px] text-emerald-600">Stress & Torture</div>
                </div>
              </button>
            </div>
          </div>

          {summary && summary.open_exceptions > 0 && (
            <div className="saas-card p-4 space-y-3 h-64 flex flex-col">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Exception Severity Breakdown</div>
              <div className="flex-1 min-h-0">
                <ExceptionSeverityChart data={summary} />
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Ingestion Batch History & Lineage */}
        <div className="lg:col-span-7 saas-card p-0 flex flex-col overflow-hidden">
          
          {/* Table Header & Search */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Ingestion Lineage & Batch Audit</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">Historical record of source tape files and validation results</p>
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <input 
                type="text" 
                placeholder="Filter batches..." 
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl !pl-9.5 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Batch Records Table */}
          <div className="flex-1 overflow-auto">
            {loadingData ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Loading historical batches & lineage...</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Fetching ingestion provenance records</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400">
                <Database className="w-10 h-10 mb-3 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-medium">No batch history recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Uploaded tapes will appear here with full provenance.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Batch Reference</th>
                    <th className="px-4 py-3">Source Tape</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Volume & Breakdown</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map(batch => {
                    const isCopied = copiedBatch === batch.id;
                    const cleanPercentage = batch.total_records > 0 
                      ? Math.round(((batch.total_records - batch.exception_records) / batch.total_records) * 100) 
                      : 100;

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* Batch ID with Copy Tool */}
                        <td className="table-cell">
                          <button 
                            onClick={() => copyToClipboard(batch.id, batch.id)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100/70 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title="Click to copy batch ID"
                          >
                            <span>{batch.id.slice(0, 16)}...</span>
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </td>

                        {/* Filename */}
                        <td className="table-cell">
                          <div className="font-semibold text-slate-900 text-xs">{batch.filename}</div>
                          <div className="text-[10px] text-slate-400">By {batch.uploaded_by}</div>
                        </td>

                        {/* Timestamp */}
                        <td className="table-cell text-xs text-slate-500">
                          {new Date(batch.uploaded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Volume & Exceptions */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {batch.total_records?.toLocaleString() || 0}
                            </span>
                            {batch.total_records === 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                                0 records (Empty)
                              </span>
                            ) : batch.exception_records > 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200/60">
                                {batch.exception_records} exceptions ({100 - cleanPercentage}%)
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                                100% Clean ({batch.total_records} valid)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="table-cell text-right">
                          <span className="badge-verified text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Processed</span>
                          </span>
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

      {/* Policy Catalog Modal */}
      {showPolicyModal && (
        <PolicyCatalogModal onClose={() => setShowPolicyModal(false)} />
      )}

    </div>
  );
}

function PolicyCatalogModal({ onClose }) {
  const POLICIES = [
    { id: 'POL-ID-001', name: 'Primary Identifier Integrity', severity: 'CRITICAL', field: 'loan_id', desc: 'Ensures loan_id is present, non-empty, and unique across the active portfolio.' },
    { id: 'POL-BAL-001', name: 'Positive Balance Invariant', severity: 'HIGH', field: 'principal_balance', desc: 'Validates that principal balance is strictly positive (non-negative, non-zero).' },
    { id: 'POL-RATE-001', name: 'Interest Rate Corridor', severity: 'MEDIUM', field: 'interest_rate', desc: 'Verifies interest rates fall within the compliant corridor (0.5% to 25.0%).' },
    { id: 'POL-BOR-001', name: 'Borrower Name Non-Null', severity: 'HIGH', field: 'borrower_name', desc: 'Ensures obligor identity is specified and not blank.' },
    { id: 'POL-DATE-001', name: 'Chronological Sanity Check', severity: 'HIGH', field: 'maturity_date', desc: 'Enforces that maturity_date must strictly succeed origination_date.' },
    { id: 'POL-STATE-001', name: 'State Code ISO Standardization', severity: 'LOW', field: 'property_state', desc: 'Validates 2-letter uppercase US state abbreviations (e.g. CA, NY, TX).' },
    { id: 'POL-DUP-001', name: 'Cross-Upload Dedup Interceptor', severity: 'CRITICAL', field: 'loan_id', desc: 'Prevents collision with existing active or verified loan records.' },
    { id: 'POL-LTV-001', name: 'LTV Boundary Check', severity: 'MEDIUM', field: 'ltv_ratio', desc: 'Flags high loan-to-value ratios exceeding statutory lending bounds.' },
    { id: 'POL-FICO-001', name: 'Credit Score Range Verification', severity: 'MEDIUM', field: 'credit_score', desc: 'Validates FICO credit scores within standard 300-850 boundaries.' },
    { id: 'POL-ZIP-001', name: 'Postal Code Format Check', severity: 'LOW', field: 'zip_code', desc: 'Ensures standard 5-digit US ZIP code formatting.' },
    { id: 'POL-STAT-001', name: 'Payment Status Validity', severity: 'LOW', field: 'loan_status', desc: 'Checks against authorized loan statuses (Current, Delinquent, Paid Off).' },
    { id: 'POL-DOC-001', name: 'Document Availability Manifest', severity: 'MEDIUM', field: 'document_status', desc: 'Validates promissory note and deed attachment in the document repository.' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Intain Policy Verification Engine (12 Rules)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated statutory loan tape compliance rules and severity levels</p>
            </div>
          </div>
          <button 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" 
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {POLICIES.map(p => (
              <div key={p.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{p.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    p.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    p.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    p.severity === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {p.severity}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-800">{p.name}</div>
                <div className="text-[11px] text-slate-600 leading-relaxed">{p.desc}</div>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/50">
                  Target Field: <span className="text-indigo-600 font-semibold">{p.field}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            All rules execute deterministically at $O(1)$ in-memory before SQLite commit.
          </div>
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4">
            Close Catalog
          </button>
        </div>
      </div>
    </div>
  );
}

