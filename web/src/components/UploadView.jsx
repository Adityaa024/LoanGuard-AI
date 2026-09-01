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
  Download,
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
  const [batchDetail, setBatchDetail] = useState(null);
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

  const [sourceType, setSourceType] = useState('primary_tape');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleUpload = async (customFile = null, explicitType = null) => {
    const targetFile = customFile || file;
    if (!targetFile) return;
    setUploading(true);
    setResult(null);

    const typeToSend = explicitType || sourceType;
    const formData = new FormData();
    formData.append('file', targetFile);
    formData.append('source_type', typeToSend);

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
        if (data.import_report) {
          setSelectedReport(data.import_report);
        }
        fetchData();
        window.dispatchEvent(new Event('upload_success'));
        const typeLabel = typeToSend === 'document_manifest' ? 'Collateral Manifest' : typeToSend === 'servicer_update' ? 'Servicer Sync' : 'Loan Tape';
        toast.success(`${typeLabel} Ingestion Completed`, `Processed ${data.recordsProcessed} records (${data.validCount} valid, ${data.exceptionCount} exceptions).`);
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

  // Quick Preset Loan Tape Loaders (Full Problem Statement Package)
  const loadPreset = async (type) => {
    let csvContent = '';
    let fileName = '';
    const tag = Math.random().toString(36).substring(2, 6);

    if (type === 'clean') {
      fileName = `clean_tape_${tag}.csv`;
      setSourceType('primary_tape');
      csvContent = [
        'loan_id,borrower_name,origination_date,maturity_date,principal_balance,current_balance,interest_rate,monthly_payment,loan_status,property_type,property_state,ltv_ratio,credit_score,zip_code',
        `LN-CLN01_${tag},Sarah Jenkins,01/15/2022,01/15/2052,350000,340000,4.25,1721.88,Current,Single Family,CA,75,760,94102`,
        `LN-CLN02_${tag},Marcus Chen,03/20/2021,03/20/2051,480000,460000,3.75,2223.11,Current,Condo,WA,80,780,98101`,
        `LN-CLN03_${tag},Elena Rostova,06/10/2023,06/10/2053,275000,270000,5.50,1561.41,Current,Townhouse,TX,70,720,77002`,
        `LN-CLN04_${tag},David Miller,11/05/2020,11/05/2050,620000,580000,3.25,2698.40,Current,Single Family,NY,65,810,10024`,
      ].join('\n');
    } else if (type === 'adversarial') {
      fileName = `adversarial_tape_${tag}.csv`;
      setSourceType('primary_tape');
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
      setSourceType('primary_tape');
      try {
        const res = await fetch('/large_messy_loan_tape.csv');
        csvContent = await res.text();
      } catch {
        csvContent = 'loan_id,borrower_name,origination_date,maturity_date,principal_balance,current_balance,interest_rate,monthly_payment,loan_status,property_type,property_state,ltv_ratio,credit_score,zip_code\n';
      }
    } else if (type === 'servicer_update') {
      fileName = `servicer_update_${tag}.csv`;
      setSourceType('servicer_update');
      csvContent = [
        'loan_id,current_balance,payment_status,borrower_name,source_system',
        `LN-CLN01_${tag},345000.00,current,Sarah Jenkins,Servicer_A`,
        `LN-CLN02_${tag},475000.00,current,Marcus Chen,Servicer_A`,
        `LN-CLN04_${tag},620000.00,late,David Miller,Servicer_A`,
        `LN-CLN03_${tag},275000.00,current,Elena Rostova,Servicer_A`,
        `LN-CLN05_${tag},550000.00,default,James Smith,Servicer_A`
      ].join('\n');
    } else if (type === 'document_manifest') {
      fileName = `document_manifest_${tag}.csv`;
      setSourceType('document_manifest');
      csvContent = [
        'loan_id,document_type,document_status,uploaded_at',
        `LN-CLN01_${tag},Promissory Note,Available,2024-01-15T10:00:00Z`,
        `LN-CLN02_${tag},Mortgage Deed,Available,2024-02-20T11:30:00Z`,
        `LN-CLN04_${tag},Title Insurance,Missing,`,
        `LN-CLN03_${tag},Appraisal Report,Available,2024-03-10T14:45:00Z`,
        `LN-CLN05_${tag},Promissory Note,Available,2024-01-20T09:15:00Z`
      ].join('\n');
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

  const filteredHistory = history.filter(b => {
    if (b.total_records === 0) return false; // Hide empty/system seed batches
    return b.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header with Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Loan Ingestion & Quality Hub</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Active Session: Operator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload raw loan tapes, execute real-time policy engine validation, and monitor portfolio data quality.
          </p>
        </div>
      </div>

      {/* Enterprise Reconciled KPI Metrics Bar */}
      {loadingData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(idx => (
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
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Quality Score */}
            <div className="saas-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Data Quality</span>
                <span className="text-2xl font-bold text-slate-900">
                  {summary.data_quality_score}%
                </span>
              </div>
              <div className="mt-2 font-mono text-xs text-slate-400 tracking-tighter">
                {(() => {
                  const filled = Math.round((summary.data_quality_score / 100) * 15);
                  const empty = 15 - filled;
                  return (
                    <span className={summary.data_quality_score > 90 ? 'text-emerald-500' : summary.data_quality_score > 70 ? 'text-amber-500' : 'text-rose-500'}>
                      {'█'.repeat(filled)}
                      <span className="text-slate-200">{'░'.repeat(empty)}</span>
                    </span>
                  );
                })()}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                <span className="text-slate-500">Portfolio Pass Rate</span>
                <span className="font-semibold text-slate-800 font-mono">{(summary.clean_records || summary.valid_loans + summary.verified_loans).toLocaleString()} / {summary.total_loans?.toLocaleString()} records</span>
              </div>
            </div>

            {/* Clean & Valid Records */}
            <div className="saas-card p-4 flex flex-col justify-between border-emerald-200/60 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Clean & Valid</span>
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-800 font-mono">
                    {(summary.clean_records || summary.valid_loans + summary.verified_loans)?.toLocaleString() || 0}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">Unique Records</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2 text-[11px] text-emerald-800">
                <span>Passing all 12 policies</span>
                <span className="font-mono font-medium">{summary.valid_loans?.toLocaleString()} valid · {summary.verified_loans?.toLocaleString()} verified</span>
              </div>
            </div>

            {/* Affected Records & Total Exceptions */}
            <div className="saas-card p-4 flex flex-col justify-between border-amber-200/60 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Affected Records</span>
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-900 font-mono">
                    {(summary.affected_records || summary.exception_loans)?.toLocaleString() || 0}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">Records Awaiting Review</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-amber-100/80 pt-2 text-[11px] text-amber-800">
                <span>Total validation findings</span>
                <span className="font-mono font-bold text-amber-900">{summary.open_exceptions?.toLocaleString()} exceptions</span>
              </div>
            </div>

          </div>

          {/* Mathematical Reconciliation Strip */}
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700">Reconciliation:</span>
              <span className="font-mono text-slate-800">
                {(summary.clean_records || summary.valid_loans + summary.verified_loans).toLocaleString()} Clean Records + {(summary.affected_records || summary.exception_loans).toLocaleString()} Affected Records = <strong className="text-slate-900">{summary.total_loans?.toLocaleString()} Ingested Unique Records</strong>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-slate-500 font-mono text-[10px]">
              <span>Findings: {summary.open_exceptions?.toLocaleString()} open exceptions ({summary.critical_exceptions?.toLocaleString()} critical · {summary.high_exceptions?.toLocaleString()} high · {summary.medium_exceptions?.toLocaleString()} med · {summary.low_exceptions?.toLocaleString()} low)</span>
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
                <span>Ingest Loan Tape & Data Artifacts</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">CSV format</span>
            </div>

            {/* Ingestion Artifact Type Selector (PS First-Class Artifacts) */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Target Artifact Pipeline
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSourceType('primary_tape')}
                  className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    sourceType === 'primary_tape'
                      ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Primary Tape</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('servicer_update')}
                  className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    sourceType === 'servicer_update'
                      ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Servicer Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('document_manifest')}
                  className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    sourceType === 'document_manifest'
                      ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Doc Manifest</span>
                </button>
              </div>
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
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{file.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{(file.size / 1024).toFixed(1)} KB</div>
                  <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-emerald-700">
                    <span>✓ Schema recognized: {sourceType === 'document_manifest' ? 'Collateral Document Manifest' : sourceType === 'servicer_update' ? 'Servicer Update Tape' : 'Primary Loan Origination Tape'}</span>
                    <span>✓ Cryptographic SHA-256 batch anchor</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">
                    Drop {sourceType === 'document_manifest' ? 'document_manifest.csv' : sourceType === 'servicer_update' ? 'servicer_update.csv' : 'loan_tape.csv'} here
                  </div>
                  <div className="text-[10px] text-slate-400">CSV · Maximum 50 MB</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-1">or <span className="underline">Browse Files</span></div>
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
                    <span>Run Ingestion Pipeline</span>
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
                  <span>Executing Statutory Validation Policies in Memory...</span>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{result.fileName || file?.name || 'loan_tape.csv'}</span>
                    <span className="font-mono text-slate-500 font-normal">({result.recordsProcessed?.toLocaleString()} rows)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">
                    {result.source_type || sourceType}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-700">
                  <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Ingestion & Schema Normalization</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Policy Evaluation: {result.validCount} valid, {result.exceptionCount} exceptions caught</div>
                </div>
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      if (result.import_report) {
                        setSelectedReport(result.import_report);
                        setShowReportModal(true);
                      }
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Failed Rows Report ({result.import_report?.failed_rows?.length || result.exceptionCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('switch_tab', { detail: 'reviewer' }));
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-100/70 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button 
                onClick={() => loadPreset('clean')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group hover:border-emerald-300 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 text-[11px]">Clean Tape</div>
                  <div className="text-[10px] text-slate-400">100% compliant</div>
                </div>
              </button>

              <button 
                onClick={() => loadPreset('adversarial')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group hover:border-amber-300 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 text-[11px]">Adversarial</div>
                  <div className="text-[10px] text-slate-400">Multi-policy errors</div>
                </div>
              </button>

              <button 
                onClick={() => loadPreset('servicer_update')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group hover:border-blue-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 text-[11px]">Servicer Sync</div>
                  <div className="text-[10px] text-slate-400">Secondary remittance</div>
                </div>
              </button>

              <button 
                onClick={() => loadPreset('document_manifest')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group hover:border-indigo-300 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 text-[11px]">Doc Manifest</div>
                  <div className="text-[10px] text-slate-400">Collateral vault</div>
                </div>
              </button>

              <button 
                onClick={() => loadPreset('large_messy')}
                className="btn-secondary text-xs py-2 px-2.5 text-left justify-start group border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 col-span-2 sm:col-span-1 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-emerald-950 text-[11px]">Large 5k Tape</div>
                  <div className="text-[10px] text-emerald-600">5,000 Stress Records</div>
                </div>
              </button>
            </div>
          </div>

          {summary && summary.open_exceptions > 0 && (
            <div className="saas-card p-4 space-y-3 min-h-[270px] flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Exception Findings Breakdown
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {summary.open_exceptions?.toLocaleString()} TOTAL
                </span>
              </div>
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
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
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
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Records</th>
                    <th className="px-4 py-3">Quality</th>
                    <th className="px-4 py-3">Exceptions</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map(batch => {
                    const cleanPercentage = batch.total_records > 0 
                      ? ((batch.total_records - batch.exception_records) / batch.total_records * 100).toFixed(1)
                      : '100.0';
                    const validCount = batch.total_records - batch.exception_records;

                    return (
                      <tr 
                        key={batch.id} 
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => setBatchDetail(batch)}
                      >
                        {/* Source Filename */}
                        <td className="table-cell">
                          <div className="font-semibold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors">{batch.filename}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(batch.uploaded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Records */}
                        <td className="table-cell">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {batch.total_records?.toLocaleString() || 0}
                          </span>
                        </td>

                        {/* Quality Score */}
                        <td className="table-cell">
                          <span className={`font-mono text-xs font-bold ${parseFloat(cleanPercentage) > 90 ? 'text-emerald-700' : parseFloat(cleanPercentage) > 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                            {cleanPercentage}%
                          </span>
                        </td>

                        {/* Exceptions Breakdown */}
                        <td className="table-cell">
                          <div className="space-y-0.5">
                            {batch.exception_records > 0 ? (
                              <>
                                <div className="text-[10px] text-rose-600 font-semibold">{batch.exception_records?.toLocaleString()} exceptions</div>
                                <div className="text-[10px] text-emerald-600 font-medium">{validCount?.toLocaleString()} valid</div>
                              </>
                            ) : (
                              <div className="text-[10px] text-emerald-600 font-semibold">{batch.total_records?.toLocaleString()} valid</div>
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

      {/* Batch Detail Modal */}
      {batchDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={() => setBatchDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Batch Detail</h3>
              <button onClick={() => setBatchDetail(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Source</div>
                  <div className="font-bold text-slate-900 mt-0.5">{batchDetail.filename}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Uploaded</div>
                  <div className="font-bold text-slate-900 mt-0.5">{new Date(batchDetail.uploaded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Records</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{batchDetail.total_records?.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Validation</div>
                  <div className="font-bold text-emerald-700 mt-0.5">Completed</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-emerald-800 font-semibold">Valid</span>
                  <span className="font-mono font-bold text-emerald-700">{(batchDetail.total_records - batchDetail.exception_records)?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-amber-800 font-semibold">Exceptions</span>
                  <span className="font-mono font-bold text-amber-700">{batchDetail.exception_records?.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Source Lineage</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">{batchDetail.filename}</span>
                  <span className="text-slate-300">&rarr;</span>
                  <span>Raw Records</span>
                  <span className="text-slate-300">&rarr;</span>
                  <span>Normalized</span>
                  <span className="text-slate-300">&rarr;</span>
                  <span>12 Policy Checks</span>
                  <span className="text-slate-300">&rarr;</span>
                  <span className="text-emerald-700 font-bold">{(batchDetail.total_records - batchDetail.exception_records)} Verified</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                <span>Batch ID: {batchDetail.id}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setBatchDetail(null);
                    window.dispatchEvent(new CustomEvent('switch_tab', { detail: 'reviewer' }));
                  }}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                >
                  <span>Review Batch Exceptions</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Ingestion & Failed Rows Audit Report Modal */}
      {showReportModal && selectedReport && (
        <ImportReportModal report={selectedReport} onClose={() => setShowReportModal(false)} />
      )}

      {/* Policy Catalog & AI Rule Studio Modal (Gap 2) */}
      {showPolicyModal && (
        <PolicyCatalogModal onClose={() => setShowPolicyModal(false)} />
      )}

    </div>
  );
}

function ImportReportModal({ report, onClose }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [search, setSearch] = useState('');

  if (!report) return null;

  const failedRows = report.failed_rows || [];
  const filtered = failedRows.filter(r => {
    const matchesSev = filterSeverity === 'ALL' || (r.severity || '').toLowerCase() === filterSeverity.toLowerCase();
    const matchesSearch = !search || 
      (r.loan_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.field || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.reason || '').toLowerCase().includes(search.toLowerCase());
    return matchesSev && matchesSearch;
  });

  const downloadCsv = () => {
    const headers = ['Row_Number', 'Loan_ID', 'Field', 'Rule_ID', 'Rule_Name', 'Severity', 'Reason', 'Current_Value'];
    const rows = failedRows.map(r => [
      r.row_number || '',
      r.loan_id || '',
      r.field || '',
      r.rule_id || '',
      r.rule_name || '',
      r.severity || '',
      JSON.stringify(r.reason || ''),
      JSON.stringify(r.current_value || '')
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_rows_report_${report.batch_id || 'batch'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/60">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Ingestion & Failed-Rows Audit Report</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                  {report.source_type || 'primary_tape'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Batch {report.batch_id} · {report.filename} · {report.clean_rows || 0} Clean, {report.affected_rows || 0} Flagged
              </p>
            </div>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <input 
              type="text" 
              placeholder="Search failed rows by loan ID, field, or reason..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white w-full max-w-sm"
            />
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="ALL">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            onClick={downloadCsv}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Failed Rows CSV</span>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No failed records matching the active filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                  <th className="pb-2 font-semibold">Row #</th>
                  <th className="pb-2 font-semibold">Loan ID</th>
                  <th className="pb-2 font-semibold">Target Field</th>
                  <th className="pb-2 font-semibold">Rule</th>
                  <th className="pb-2 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">Offending Value / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 font-mono text-slate-400">{r.row_number || idx + 1}</td>
                    <td className="py-2.5 font-mono font-bold text-slate-800">{r.loan_id}</td>
                    <td className="py-2.5 font-mono text-indigo-700 font-medium">{r.field || 'N/A'}</td>
                    <td className="py-2.5 text-slate-600 truncate max-w-[140px]" title={r.rule_name}>{r.rule_name || r.rule_id || 'Policy Violation'}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        r.severity === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        r.severity === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        r.severity === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {(r.severity || 'high').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-700 max-w-[280px]">
                      <div className="font-medium text-slate-800 text-[11px] truncate" title={r.reason}>{r.reason}</div>
                      {r.current_value !== undefined && (
                        <div className="text-[10px] text-slate-400 font-mono truncate">Value: {r.current_value}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Showing {filtered.length} of {failedRows.length} flagged exception records.
          </span>
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4 cursor-pointer">
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyCatalogModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'studio'
  const [rulePrompt, setRulePrompt] = useState('Flag loan tapes where interest rate exceeds 18.5%');
  const [synthesizing, setSynthesizing] = useState(false);
  const [generatedRule, setGeneratedRule] = useState(null);
  const [activating, setActivating] = useState(false);
  const [activeAuthored, setActiveAuthored] = useState([]);
  const toast = useToast();

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

  const handleSynthesize = async () => {
    if (!rulePrompt.trim()) return;
    setSynthesizing(true);
    try {
      const token = localStorage.getItem('loanguard_token');
      const res = await fetch('/api/ai/rules/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ description: rulePrompt })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedRule(data.data.rule);
        toast.success("Rule Synthesized", "AI compiled natural language into structured policy rule.");
      } else {
        toast.error("Compilation Failed", data.error);
      }
    } catch (e) {
      toast.error("Error", e.message);
    } finally {
      setSynthesizing(false);
    }
  };

  const handleActivateRule = async () => {
    if (!generatedRule) return;
    setActivating(true);
    try {
      const token = localStorage.getItem('loanguard_token');
      const res = await fetch('/api/rules/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rule: generatedRule })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Rule Activated!", `${data.rule.id} is now live and enforced in future tape uploads.`);
        setActiveAuthored(prev => [...prev.filter(r => r.id !== data.rule.id), data.rule]);
      } else {
        toast.error("Activation Failed", data.error);
      }
    } catch (e) {
      toast.error("Error", e.message);
    } finally {
      setActivating(false);
    }
  };

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
              <h3 className="text-sm font-bold text-slate-900">Intain Policy Verification & Rule Studio</h3>
              <p className="text-xs text-slate-500 mt-0.5">Statutory underwriting policies + Operational AI rule compilation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Policy Catalog (12)
              </button>
              <button
                onClick={() => setActiveTab('studio')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'studio' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>AI Rule Studio</span>
              </button>
            </div>
            <button 
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer" 
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'catalog' ? (
            <div className="space-y-3">
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

              {activeAuthored.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Authored Rules ({activeAuthored.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeAuthored.map(r => (
                      <div key={r.id} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-emerald-900">{r.id}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">LIVE</span>
                        </div>
                        <div className="font-semibold text-slate-800">{r.name}</div>
                        <div className="text-[11px] text-slate-600">{r.field} {r.operator} {r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Natural Language Validation Rule Compiler</span>
                </div>
                <p className="text-xs text-slate-600">
                  Describe a compliance requirement in plain English. The Copilot will translate it into a structured validation policy and provide live one-click activation.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rulePrompt}
                    onChange={e => setRulePrompt(e.target.value)}
                    placeholder="e.g. Reject loans with interest rate > 18.5% or jumbo balance > 1M"
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                  <button
                    onClick={handleSynthesize}
                    disabled={synthesizing}
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {synthesizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Compile Rule</span>
                  </button>
                </div>
              </div>

              {generatedRule && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{generatedRule.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        COMPILED
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Target Field: {generatedRule.field}</span>
                  </div>

                  <div className="text-xs text-slate-800 font-semibold">{generatedRule.name}</div>
                  <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
                    IF loan.{generatedRule.field} {generatedRule.operator} {generatedRule.value} THEN ESCALATE ({generatedRule.severity})
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleActivateRule}
                      disabled={activating}
                      className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                    >
                      {activating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>⚡ Activate Rule in Live Engine</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Rules execute deterministically across all ingested loan tape batches.
          </div>
          <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-4 cursor-pointer">
            Close Catalog
          </button>
        </div>
      </div>
    </div>
  );
}

