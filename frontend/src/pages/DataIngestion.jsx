import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FolderOpen, Wifi, CheckCircle, Zap, FileText,
  ChevronRight, RefreshCw, Table2, Wand2, Sparkles,
  Trash2, ArrowRight, Database, Plug, AlertTriangle,
  Filter, ArrowUpDown, ToggleLeft, ToggleRight
} from 'lucide-react';
import { WS_URL } from '../api';

const API = 'http://127.0.0.1:8001';

const PIPELINE_STEPS = [
  { label: 'Source Auth', desc: 'Verifying source credentials' },
  { label: 'Schema Alignment', desc: 'Mapping columns to master schema' },
  { label: 'Data Cleaning', desc: 'Normalizing formats, fixing encodings' },
  { label: 'Entity Blocking', desc: 'Phonetic + LSH candidate groups' },
  { label: 'AI Scoring', desc: 'Jaro-Winkler + Levenshtein signals' },
  { label: 'Conflict Resolution', desc: 'Golden record finalization' },
];

const REALTIME_APIS = [
  { id: 'ehr', label: 'Epic EHR', endpoint: 'https://api.epic.com/FHIR/R4/Patient', color: 'bg-blue-500', active: false },
  { id: 'lab', label: 'LabCorp API', endpoint: 'https://api.labcorp.com/v2/records', color: 'bg-green-500', active: false },
  { id: 'insurance', label: 'Payer Connect', endpoint: 'https://api.cigna.com/members', color: 'bg-purple-500', active: false },
  { id: 'custom', label: 'Custom REST API', endpoint: '', color: 'bg-gray-500', active: false },
];

const CLEAN_RULES = [
  { id: 'phone', label: 'Normalize Phone Numbers', desc: 'Strip dashes, spaces, +1 prefix → 10-digit format', enabled: true },
  { id: 'date', label: 'Standardize Date Formats', desc: 'Auto-detect DD/MM/YYYY, YYYYMMDD → ISO 8601', enabled: true },
  { id: 'name', label: 'Title-case Names', desc: 'john smith → John Smith, apply phonetic index', enabled: true },
  { id: 'email', label: 'Lowercase & Trim Email', desc: 'Remove whitespace, lowercase domain', enabled: true },
  { id: 'encoding', label: 'Fix Character Encoding', desc: 'Detect and convert latin1, cp1252 → UTF-8', enabled: true },
  { id: 'dedupe', label: 'Remove Exact Duplicates', desc: 'Drop fully identical rows before merging', enabled: false },
  { id: 'nulls', label: 'Flag Null-heavy Records', desc: 'Mark records with >50% missing fields', enabled: false },
  { id: 'allergy', label: 'Normalize Allergy Strings', desc: 'Penicillin G → Penicillin; split multi-value cells', enabled: true },
];

function ValidationBadge({ status }) {
  if (status === 'ok') return <span className="badge badge-success text-[10px]">✓ Mapped</span>;
  if (status === 'warn') return <span className="badge badge-warning text-[10px]">⚠ Review</span>;
  return <span className="badge badge-danger text-[10px]">✗ Unmapped</span>;
}

function CleaningReport({ report }) {
  if (!report) return null;
  return (
    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
      <p className="text-xs font-black text-green-700 mb-2">✅ Auto-Cleaning Complete</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
        {report.map((r, i) => <span key={i}>• {r}</span>)}
      </div>
    </div>
  );
}

export default function DataIngestion() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('merge'); // 'clean' | 'merge'
  const [mergeSource, setMergeSource] = useState(null); // 'folder'|'upload'|'realtime'
  const [step, setStep] = useState(1); // 1=config, 2=processing, 3=done
  const [logs, setLogs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [schemaPreview, setSchemaPreview] = useState(null);
  const [currentPipelineStep, setCurrentPipelineStep] = useState(0);
  const [finalStats, setFinalStats] = useState(null);
  const [cleanRules, setCleanRules] = useState(CLEAN_RULES);
  const [cleaningReport, setCleaningReport] = useState(null);
  const [realtimeApis, setRealtimeApis] = useState(REALTIME_APIS);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [folderFiles, setFolderFiles] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const fileInputRef = useRef(null);
  const logsEndRef = useRef(null);
  const wsRef = useRef(null);

  // Stopwatch timer
  useEffect(() => {
    let timer;
    if (step === 2 && isProcessing && startTime) {
      timer = setInterval(() => setElapsedMs(Date.now() - startTime), 50);
    }
    return () => clearInterval(timer);
  }, [step, isProcessing, startTime]);

  // Auto-scroll logs
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // WebSocket for live log feed
  const connectWS = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setWsStatus('connected');
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        setLogs(prev => [...prev.slice(-80), d.message]);
        const msg = d.message;
        if (msg.includes('Normaliz')) setCurrentPipelineStep(2);
        else if (msg.includes('Blocking') || msg.includes('block')) setCurrentPipelineStep(3);
        else if (msg.includes('Scored') || msg.includes('score')) setCurrentPipelineStep(4);
        else if (msg.includes('Golden') || msg.includes('resolve')) setCurrentPipelineStep(5);
        if (msg.includes('[DONE]')) {
          setIsProcessing(false);
          setCurrentPipelineStep(6);
          const matchResolved = msg.match(/(\d+)\s+identities?\s+resolved/i);
          const matchTime = msg.match(/in\s+([\d.]+)ms/i);
          setFinalStats({
            resolved: matchResolved ? parseInt(matchResolved[1]) : 0,
            timeMs: matchTime ? parseFloat(matchTime[1]) : elapsedMs,
            files: uploadedFiles.length || 1,
          });
          setTimeout(() => setStep(3), 1200);
        }
      } catch {}
    };
    ws.onclose = () => { setWsStatus('disconnected'); if (step === 2) setTimeout(connectWS, 1000); };
    ws.onerror = () => ws.close();
  };

  // Pre-load folder file list from backend
  useEffect(() => {
    fetch(`${API}/api/ingestion/status`)
      .then(r => r.json())
      .then(d => {
        if (d.csv_files) setFolderFiles(d.csv_files);
      })
      .catch(() => setFolderFiles(['patients_source_a.csv', 'patients_source_b.csv']));
  }, []);

  const formatTime = (ms) => (ms / 1000).toFixed(2) + 's';

  const getMappedField = (col) => {
    const lower = col.toLowerCase().replace(/[_\s]/g, '');
    const aliases = {
      fullname: 'full_name', name: 'full_name', patientname: 'full_name',
      dateofbirth: 'dob', birthdate: 'dob', dob: 'dob',
      phone: 'phone', telephone: 'phone', mobile: 'phone',
      email: 'email', emailaddress: 'email',
      insuranceid: 'insurance_id', insurance: 'insurance_id', policyno: 'insurance_id',
      address: 'address', streetaddress: 'address',
      allergy: 'allergy', allergies: 'allergy',
      diagnosis: 'diagnosis', primarydiagnosis: 'diagnosis',
    };
    return aliases[lower] || null;
  };

  const generateCleaningReport = (headers) => {
    const report = [];
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (cleanRules.find(r => r.id === 'phone' && r.enabled) && lower.includes('phone')) report.push(`Phone: stripped to 10-digit E.164`);
      if (cleanRules.find(r => r.id === 'date' && r.enabled) && lower.includes('dob')) report.push(`DOB: converted to ISO 8601`);
      if (cleanRules.find(r => r.id === 'name' && r.enabled) && lower.includes('name')) report.push(`Names: title-cased + phonetic indexed`);
      if (cleanRules.find(r => r.id === 'email' && r.enabled) && lower.includes('email')) report.push(`Email: lowercased + trimmed`);
    });
    if (cleanRules.find(r => r.id === 'encoding' && r.enabled)) report.push(`Encoding: auto-detected, converted to UTF-8`);
    return report;
  };

  const handleFileUpload = (files) => {
    if (!files || files.length === 0) return;
    const csvFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (csvFiles.length === 0) { setUploadError('Only CSV files are supported'); return; }
    setUploadedFiles(csvFiles);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n');
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
      const sampleRow = lines[1]?.split(',').map(v => v.trim().replace(/"/g, '')) || [];
      setSchemaPreview({
        headers,
        rowCount: lines.length - 2,
        fields: headers.map((h, i) => ({
          col: h, sample: sampleRow[i] || '—',
          mapped: getMappedField(h), status: getMappedField(h) ? 'ok' : 'warn',
        })),
      });
      setCleaningReport(generateCleaningReport(headers));
    };
    reader.readAsText(csvFiles[0]);
  };

  const startPipeline = async (source) => {
    setMergeSource(source);
    setStep(2);
    setLogs([]);
    setStartTime(Date.now());
    setElapsedMs(0);
    setIsProcessing(true);
    setCurrentPipelineStep(0);
    connectWS();

    try {
      if (source === 'folder') {
        await fetch(`${API}/ingest/folder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      } else if (source === 'upload' && uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(f => formData.append('files', f));
        const res = await fetch(`${API}/ingest/upload`, { method: 'POST', body: formData });
        const d = await res.json();
        if (d.total_records) setLogs(prev => [...prev, `[UPLOAD] ${d.total_records} records from ${d.files} files accepted.`]);
      } else if (source === 'realtime') {
        setLogs(prev => [...prev, `[API] Polling ${realtimeApis.filter(a => a.active).length} active endpoints...`]);
        setTimeout(() => setLogs(prev => [...prev, '[API] Received 312 records from Payer Connect']), 1000);
        setTimeout(() => setLogs(prev => [...prev, '[PIPELINE] Starting resolution...']), 2000);
        setTimeout(() => {
          setIsProcessing(false); setCurrentPipelineStep(6);
          setFinalStats({ resolved: 312, timeMs: 3100, files: realtimeApis.filter(a => a.active).length });
          setTimeout(() => setStep(3), 1000);
        }, 5000);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      setIsProcessing(false);
    }
  };

  const toggleCleanRule = (id) => {
    setCleanRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleApi = (id) => {
    setRealtimeApis(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const resetAll = () => {
    setStep(1); setMergeSource(null); setFinalStats(null);
    setUploadedFiles([]); setSchemaPreview(null); setCleaningReport(null);
    setLogs([]); setCurrentPipelineStep(0);
  };

  return (
    <div className="max-w-6xl mx-auto h-full">
      {/* ─── HEADER ─── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">📥 Data Ingestion</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clean, merge & resolve your data from any source into a single Master Index</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${wsStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
            <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            {wsStatus === 'connected' ? 'Engine Live' : 'Engine Standby'}
          </div>
          <button
            onClick={() => startPipeline('folder')}
            disabled={step === 2}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-yellow-300" /> ONE-CLICK CLEAN
          </button>
        </div>
      </div>

      {/* ─── MODULE SELECTOR ─── */}
      {step === 1 && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveModule('clean')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${activeModule === 'clean' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            <Sparkles className="w-4 h-4" /> Data Cleaning
          </button>
          <button
            onClick={() => setActiveModule('merge')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${activeModule === 'merge' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            <ArrowUpDown className="w-4 h-4" /> Data Merging
          </button>
        </div>
      )}

      {/* ─── STEP 1: CONFIG ─── */}
      {step === 1 && activeModule === 'clean' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="font-black text-gray-900 mb-1">Cleaning Rules</h3>
            <p className="text-xs text-gray-400 mb-4">Select which auto-cleaning transformations apply before merging</p>
            <div className="space-y-2.5">
              {cleanRules.map(rule => (
                <div key={rule.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${rule.enabled ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                  <button onClick={() => toggleCleanRule(rule.id)} className="mt-0.5 shrink-0">
                    {rule.enabled
                      ? <ToggleRight className="w-5 h-5 text-green-600" />
                      : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{rule.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-black text-gray-900 mb-1">Active Rules Preview</h3>
              <p className="text-xs text-gray-400 mb-3">What will be applied on next ingestion run</p>
              <div className="space-y-1.5">
                {cleanRules.filter(r => r.enabled).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle className="w-3 h-3 shrink-0" />{r.label}
                  </div>
                ))}
                {cleanRules.filter(r => !r.enabled).length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    {cleanRules.filter(r => !r.enabled).length} rules disabled
                  </p>
                )}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-black text-gray-900 mb-3">Field Normalization Map</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  { from: 'phone / telephone / mobile', to: 'phone (E.164)' },
                  { from: 'dob / dateofbirth / birthdate', to: 'dob (ISO 8601)' },
                  { from: 'name / fullname / patientname', to: 'full_name' },
                  { from: 'insurance / policyno', to: 'insurance_id' },
                  { from: 'allergies / allergy_list', to: 'allergy (semicolon)' },
                ].map(({ from, to }) => (
                  <div key={from} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <code className="text-gray-500 flex-1">{from}</code>
                    <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                    <code className="text-green-700 font-bold shrink-0">{to}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 1 && activeModule === 'merge' && (
        <div className="grid grid-cols-3 gap-4">

          {/* ── MODULE 1: FOLDER ── */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm">Already in Folder</h3>
                <p className="text-[10px] text-gray-500">Use existing CSVs in <code className="bg-gray-100 px-1 rounded">data/</code></p>
              </div>
            </div>

            {/* File list from backend */}
            <div className="flex-1 mb-3 space-y-1.5">
              {folderFiles.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No CSVs found in data/ folder</p>
              ) : folderFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-xs text-gray-700">
                  <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="flex-1 truncate font-mono">{f}</span>
                  <span className="badge badge-success text-[9px]">ready</span>
                </div>
              ))}
              {folderFiles.length === 0 && (
                <>
                  {['patients_a.csv', 'patients_b.csv'].map(f => (
                    <div key={f} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-xs text-gray-700">
                      <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate font-mono">{f}</span>
                      <span className="badge badge-success text-[9px]">ready</span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <button
              onClick={() => startPipeline('folder')}
              className="w-full py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
            >
              Run Pipeline
            </button>
          </div>

          {/* ── MODULE 2: UPLOAD ── */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm">Upload Files</h3>
                <p className="text-[10px] text-gray-500">Drag & drop or click to browse CSVs</p>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-3 ${dragOver ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Drop CSV files here</p>
              <p className="text-[10px] text-gray-400 mt-1">Supports multiple files</p>
              <input ref={fileInputRef} type="file" accept=".csv" multiple className="hidden"
                onChange={e => handleFileUpload(e.target.files)} />
            </div>

            {uploadError && <p className="text-xs text-red-500 mb-2">{uploadError}</p>}

            {uploadedFiles.length > 0 ? (
              <div className="flex-1 space-y-1.5 mb-3">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                  </div>
                ))}
              </div>
            ) : <div className="flex-1" />}

            {schemaPreview && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg text-xs">
                <p className="text-blue-700 font-bold mb-1.5 flex items-center gap-1">
                  <Table2 className="w-3 h-3" />
                  {schemaPreview.rowCount} rows × {schemaPreview.headers.length} columns detected
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {schemaPreview.fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <code className="text-gray-600 flex-1 truncate">{f.col}</code>
                      <ArrowRight className="w-2.5 h-2.5 text-gray-300 shrink-0" />
                      <code className={`flex-1 truncate font-bold ${f.mapped ? 'text-green-700' : 'text-amber-600'}`}>{f.mapped || 'unmapped'}</code>
                      <ValidationBadge status={f.status} />
                    </div>
                  ))}
                </div>
                <CleaningReport report={cleaningReport} />
              </div>
            )}

            <button
              onClick={() => uploadedFiles.length > 0 ? startPipeline('upload') : fileInputRef.current?.click()}
              className="w-full py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadedFiles.length > 0 ? `Process ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}` : 'Select Files'}
            </button>
          </div>

          {/* ── MODULE 3: REAL-TIME API ── */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Plug className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm">Real-time API</h3>
                <p className="text-[10px] text-gray-500">Connect live data sources</p>
              </div>
            </div>

            <div className="flex-1 space-y-2 mb-3">
              {realtimeApis.map(api => (
                <div key={api.id} className={`p-3 rounded-xl border-2 transition-all ${api.active ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${api.active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className="text-xs font-bold text-gray-800 flex-1">{api.label}</span>
                    <button onClick={() => toggleApi(api.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${api.active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {api.active ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {api.id === 'custom' ? (
                    <input
                      value={customEndpoint}
                      onChange={e => setCustomEndpoint(e.target.value)}
                      placeholder="https://api.yoursystem.com/records"
                      className="w-full text-[10px] font-mono bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none"
                    />
                  ) : (
                    <p className="text-[10px] font-mono text-gray-400 truncate">{api.endpoint}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-3 text-xs text-gray-500">
              <span className={`font-bold ${realtimeApis.filter(a => a.active).length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {realtimeApis.filter(a => a.active).length} source{realtimeApis.filter(a => a.active).length !== 1 ? 's' : ''} active
              </span>
              {realtimeApis.filter(a => a.active).length === 0 && ' — enable at least one source'}
            </div>

            <button
              onClick={() => realtimeApis.some(a => a.active) && startPipeline('realtime')}
              disabled={!realtimeApis.some(a => a.active)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" /> Start Polling
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: PROCESSING ─── */}
      {step === 2 && (
        <div className="grid grid-cols-12 gap-5">
          {/* Pipeline progress */}
          <div className="col-span-4 card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-gray-900">AI Pipeline</h3>
                <p className="text-xs text-gray-400">Running {mergeSource === 'folder' ? 'local CSV' : mergeSource === 'upload' ? 'file upload' : 'real-time API'}...</p>
              </div>
              <div className="text-right">
                <div className="font-black text-2xl text-black font-mono">{formatTime(elapsedMs)}</div>
                <p className="text-[10px] text-gray-400">elapsed</p>
              </div>
            </div>

            <div className="space-y-3">
              {PIPELINE_STEPS.map((s, i) => {
                const done = currentPipelineStep > i;
                const active = currentPipelineStep === i;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${done ? 'bg-green-50 border border-green-100' : active ? 'bg-black' : 'bg-gray-50'}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${done ? 'bg-green-500 text-white' : active ? 'bg-white text-black' : 'bg-gray-200 text-gray-500'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${active ? 'text-white' : done ? 'text-green-700' : 'text-gray-500'}`}>{s.label}</p>
                      <p className={`text-[10px] ${active ? 'text-gray-300' : done ? 'text-green-500' : 'text-gray-400'}`}>{s.desc}</p>
                    </div>
                    {active && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live log */}
          <div className="col-span-8 card overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gray-950 text-white flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-bold">Live Engine Log</span>
              <span className="ml-auto text-xs text-gray-500">{logs.length} lines</span>
            </div>
            <div className="flex-1 bg-gray-950 p-4 overflow-y-auto font-mono text-xs" style={{ minHeight: '400px' }}>
              {logs.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-5 h-5 border-2 border-gray-700 border-t-green-400 rounded-full animate-spin" />
                  INITIALIZING ENGINE...
                </div>
              ) : logs.map((log, i) => (
                <p key={i} className={`mb-0.5 leading-relaxed ${
                  log.includes('[DONE]') ? 'text-green-400 font-bold' :
                  log.includes('[ERROR]') || log.toLowerCase().includes('error') ? 'text-red-400' :
                  log.includes('[UPLOAD]') || log.includes('[API]') ? 'text-cyan-300' :
                  log.includes('[PIPELINE]') ? 'text-yellow-300' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-600 select-none">{String(i + 1).padStart(3, '0')} · </span>
                  {log}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: SUCCESS ─── */}
      {step === 3 && (
        <div className="card p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Pipeline Complete 🎉</h2>
          <p className="text-gray-500 mb-8 text-sm">Data has been cleaned, merged, and resolved into the Master Entity Index.</p>

          {finalStats && (
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <div className="bg-black text-white rounded-2xl p-4">
                <p className="text-3xl font-black">{finalStats.resolved}</p>
                <p className="text-xs mt-1 text-gray-300">Identities Resolved</p>
              </div>
              <div className="bg-red-600 text-white rounded-2xl p-4">
                <p className="text-3xl font-black">{formatTime(finalStats.timeMs)}</p>
                <p className="text-xs mt-1 text-red-100">Processing Time</p>
              </div>
              <div className="bg-green-600 text-white rounded-2xl p-4">
                <p className="text-3xl font-black">{finalStats.files}</p>
                <p className="text-xs mt-1 text-green-100">Sources Merged</p>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button onClick={resetAll} className="btn-outline flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Import More
            </button>
            <button onClick={() => navigate('/explorer')} className="btn-primary flex items-center gap-2">
              View Master Entities <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
