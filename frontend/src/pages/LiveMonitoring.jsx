import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, CheckCircle, GitMerge, AlertTriangle, Activity, Wifi, Database, Clock, Zap, TrendingUp, ScrollText, FileText, History } from 'lucide-react';
import { checkDuplicate, approveMerge, getIngestionStatus, WS_LIVE_FEED_URL, WS_URL } from '../api';

const API = 'http://127.0.0.1:8001';

const SOURCES = ['source_a', 'source_b', 'source_c', 'source_d'];
const SOURCE_LABELS = {
  source_a: 'Source A — Hospital', source_b: 'Source B — Lab',
  source_c: 'Source C — Pharmacy', source_d: 'Source D — Insurance',
};

const EMPTY_FORM = {
  first_name: '', last_name: '', dob: '', phone: '', email: '',
  insurance_id: '', address: '', allergy: '', diagnosis: '', source: 'source_a'
};

const TABS = [
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'log', label: 'Log', icon: FileText },
  { id: 'timeline', label: 'Timeline', icon: History },
];

// Mock audit entries
const MOCK_AUDIT = [
  { id: 1, action: 'approve_merge', records: ['John Smith', 'Jon Smyth'], confidence: 0.91, rule: 'Name+DOB+Insurance', reviewer: 'Admin', note: 'Clear match via phonetic', time: '10:32 AM', changes: [{ field: 'phone', from: '+1 555-000', to: '+1 555-1234' }] },
  { id: 2, action: 'reject_merge', records: ['Maria Garcia', 'Maria Hernandez'], confidence: 0.67, rule: 'Name Only', reviewer: 'Admin', note: 'Different insurance IDs', time: '09:58 AM', changes: [] },
  { id: 3, action: 'auto_approve', records: ['David Chen', 'Dave Chen'], confidence: 0.95, rule: 'AI Auto-Approve', reviewer: 'Engine', note: '', time: '09:41 AM', changes: [] },
];

export default function LiveMonitoring() {
  const [activeTab, setActiveTab] = useState('monitor');
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [riskHint, setRiskHint] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [engineLogs, setEngineLogs] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const debounceRef = useRef(null);
  const wsEngineRef = useRef(null);
  const wsFeedRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [engineLogs]);

  // Engine Log WS
  useEffect(() => {
    let isMounted = true;
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsEngineRef.current = ws;
      ws.onopen = () => { if (isMounted) setWsConnected(true); };
      ws.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const d = JSON.parse(e.data);
          setEngineLogs(prev => [...prev.slice(-100), d.message]);
        } catch {}
      };
      ws.onclose = () => { if (isMounted) { setWsConnected(false); setTimeout(connect, 2000); } };
    };
    connect();
    return () => { isMounted = false; wsEngineRef.current?.close(); };
  }, []);

  // Live Feed WS
  useEffect(() => {
    let isMounted = true;
    const connect = () => {
      const ws = new WebSocket(WS_LIVE_FEED_URL);
      wsFeedRef.current = ws;
      ws.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'live_record') setLiveFeed(prev => [d, ...prev].slice(0, 80));
        } catch {}
      };
      ws.onclose = () => { if (isMounted) setTimeout(connect, 3000); };
    };
    connect();
    const statsInterval = setInterval(async () => {
      try { const { data } = await getIngestionStatus(); if (isMounted) setLiveStats(data); } catch {}
    }, 5000);
    return () => { isMounted = false; wsFeedRef.current?.close(); clearInterval(statsInterval); };
  }, []);

  // Predictive risk — debounce 500ms
  useEffect(() => {
    if (!form.first_name || !form.last_name) { setRiskHint(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkDuplicate({ ...form });
        if (res.data.is_duplicate) {
          setRiskHint({ risk: 'HIGH', count: res.data.matches?.length || 1, top: res.data.matches?.[0] });
        } else {
          setRiskHint({ risk: 'LOW', count: 0 });
        }
      } catch {}
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [form.first_name, form.last_name, form.dob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await checkDuplicate(form);
      setResult(res.data);
    } catch (err) { setResult({ error: err.message }); }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-black text-gray-900">⚡ Live Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time engine log, duplicate detection, audit trail, and timeline</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === id ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
        <div className={`ml-2 flex items-center gap-1 text-xs font-medium ${wsConnected ? 'text-green-600' : 'text-red-500'}`}>
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {wsConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* ── MONITOR TAB ── */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-240px)]">
          {/* Left: Form */}
          <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
            <div className="card p-4">
              <h3 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-red-600" /> New Record Check
              </h3>

              {/* Predictive risk */}
              {riskHint && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-semibold ${riskHint.risk === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {riskHint.risk === 'HIGH' ? `🚨 High duplicate risk — ${riskHint.count} similar records exist` : '✅ No duplicates predicted'}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {['first_name', 'last_name'].map(k => (
                    <div key={k}>
                      <label className="block text-[10px] text-gray-500 mb-1 uppercase font-bold">{k.replace('_', ' ')}</label>
                      <input className="input-field text-sm py-1.5" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                {[
                  { key: 'dob', placeholder: 'YYYY-MM-DD' }, { key: 'phone', placeholder: '5551234567' },
                  { key: 'email', placeholder: 'patient@email.com' }, { key: 'insurance_id', placeholder: 'INS-001' },
                  { key: 'allergy', placeholder: 'Penicillin; Sulfa' }, { key: 'diagnosis', placeholder: 'Primary diagnosis' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] text-gray-500 mb-1 uppercase font-bold">{f.key.replace('_', ' ')}</label>
                    <input className="input-field text-sm py-1.5" value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <select className="input-field text-sm py-1.5" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
                <button type="submit" disabled={loading} className="w-full py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking...</> : <><Send className="w-4 h-4" />Submit & Check</>}
                </button>
              </form>
            </div>

            {result && !result.error && (
              <div className={`card p-4 ${result.is_duplicate ? 'border-red-300' : 'border-green-300'}`}>
                {result.is_duplicate ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-black text-red-600">DUPLICATE DETECTED</span>
                    </div>
                    <p className="text-3xl font-black text-red-600 mb-3">{Math.round((result.matches?.[0]?.confidence || 0) * 100)}%</p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-xs py-1.5 bg-gray-900 text-white rounded-lg font-bold flex items-center justify-center gap-1">
                        <GitMerge className="w-3 h-3" />Merge
                      </button>
                      <button className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-bold">Override</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-black text-green-600">SAFE TO CREATE</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center: Stats + Live Feed */}
          <div className="col-span-5 flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Records', value: liveStats?.records_today ?? liveFeed.length, color: 'text-black' },
                { label: 'Dups', value: liveFeed.filter(e => e.result === 'duplicate').length, color: 'text-red-600' },
                { label: 'Review', value: liveFeed.filter(e => e.result === 'review').length, color: 'text-amber-600' },
                { label: 'Safe', value: liveFeed.filter(e => e.result === 'safe').length, color: 'text-green-600' },
              ].map(stat => (
                <div key={stat.label} className="card p-3 text-center">
                  <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex-1 card overflow-hidden flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-gray-700">Live Ingestion Feed</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {liveFeed.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    <div className="text-center"><Wifi className="w-6 h-6 mx-auto mb-2 opacity-30" /><p>Waiting for live records...</p></div>
                  </div>
                ) : liveFeed.map((entry, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    entry.result === 'duplicate' ? 'bg-red-50 border border-red-100' :
                    entry.result === 'safe' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${entry.result === 'duplicate' ? 'bg-red-500 animate-pulse' : entry.result === 'safe' ? 'bg-green-500' : 'bg-amber-400'}`} />
                    <span className="font-medium text-gray-900 flex-1 truncate">{entry.record?.full_name || 'Unknown'}</span>
                    <span className="text-gray-400">{entry.record?.source}</span>
                    <span className={`font-bold ${entry.result === 'duplicate' ? 'text-red-600' : entry.result === 'safe' ? 'text-green-600' : 'text-amber-600'}`}>
                      {entry.result?.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Engine Log */}
          <div className="col-span-4 card overflow-hidden flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 bg-gray-950 text-white">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold">Engine Log</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-950 p-3 font-mono text-xs">
              {engineLogs.length === 0 ? (
                <p className="text-gray-500">Connecting to engine...</p>
              ) : engineLogs.map((log, i) => (
                <p key={i} className={`mb-0.5 ${
                  log.includes('[DONE]') ? 'text-green-400 font-bold' :
                  log.includes('Error') ? 'text-red-400' :
                  log.includes('[PIPELINE]') ? 'text-cyan-300' :
                  'text-gray-300'
                }`}>{log}</p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT TAB ── */}
      {activeTab === 'audit' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-black text-sm text-gray-900">Complete Audit Log</span>
            <button className="btn-outline text-xs flex items-center gap-1"><Database className="w-3 h-3" />Export PDF</button>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_AUDIT.map(entry => (
              <div key={entry.id} className="px-4 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`badge text-[10px] mr-2 ${entry.action === 'approve_merge' ? 'badge-success' : entry.action === 'reject_merge' ? 'badge-danger' : 'badge-primary'}`}>
                      {entry.action.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{entry.records.join(' ↔ ')}</span>
                  </div>
                  <span className="text-xs text-gray-400">{entry.time}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs text-gray-500 mb-2">
                  <span>Confidence: <strong>{Math.round(entry.confidence * 100)}%</strong></span>
                  <span>Rule: <strong>{entry.rule}</strong></span>
                  <span>Reviewer: <strong>{entry.reviewer}</strong></span>
                  {entry.note && <span>Note: <em>{entry.note}</em></span>}
                </div>
                {entry.changes.length > 0 && (
                  <div className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                    {entry.changes.map((c, i) => (
                      <span key={i}>Field <strong>{c.field}</strong> changed from <code className="text-red-600">{c.from}</code> → <code className="text-green-600">{c.to}</code></span>
                    ))}
                  </div>
                )}
                <button className="mt-2 text-xs text-red-600 hover:underline">↩ Rollback</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOG TAB ── */}
      {activeTab === 'log' && (
        <div className="card overflow-hidden h-[calc(100vh-240px)] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 font-black text-sm text-gray-900">Raw Engine Processing Log</div>
          <div className="flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-xs">
            {engineLogs.length === 0 ? (
              <p className="text-gray-500">Engine log will appear here once processing begins.</p>
            ) : engineLogs.map((log, i) => (
              <p key={i} className={`mb-0.5 ${
                log.includes('[DONE]') ? 'text-green-400 font-bold' :
                log.includes('Error') ? 'text-red-400' :
                log.includes('[PIPELINE]') ? 'text-cyan-300' : 'text-gray-300'
              }`}>
                <span className="text-gray-600 select-none">{String(i + 1).padStart(3, '0')} · </span>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {activeTab === 'timeline' && (
        <div className="card p-6">
          <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2">
            <History className="w-4 h-4 text-red-600" /> Entity Change Timeline
          </h3>
          <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
            {[
              { time: '2026-03-20 11:45', event: 'Record Merged', detail: 'John Smith + Jon Smyth → Golden Record GR-0042', color: 'bg-green-500', icon: GitMerge },
              { time: '2026-03-20 09:30', event: 'New Source Added', detail: 'Source B added — Lab system record ingested', color: 'bg-blue-500', icon: Database },
              { time: '2026-03-19 16:15', event: 'Address Updated', detail: '123 Main St → 456 Oak Ave (Source D)', color: 'bg-amber-500', icon: AlertCircle },
              { time: '2026-03-19 10:00', event: 'Allergy Conflict Detected', detail: 'Penicillin vs No Known Allergies — flagged CRITICAL', color: 'bg-red-500', icon: AlertTriangle },
              { time: '2026-03-18 14:20', event: 'Record Created', detail: 'Initial ingestion from Source A', color: 'bg-gray-400', icon: CheckCircle },
            ].map((ev, i) => {
              const Icon = ev.icon;
              return (
                <div key={i} className="flex gap-4 items-start pl-6 relative">
                  <div className={`absolute -left-3 w-6 h-6 rounded-full ${ev.color} flex items-center justify-center`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{ev.time}</p>
                    <p className="font-bold text-gray-900 text-sm">{ev.event}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
