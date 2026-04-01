import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, CheckCircle, GitMerge, Eye, AlertTriangle, Zap, Activity, 
         Wifi, Database, Clock, TrendingUp } from 'lucide-react';
import { checkDuplicate, approveMerge, getIngestionStatus, WS_LIVE_FEED_URL } from '../api';
import EngineLog from '../components/EngineLog';

const SOURCES = ['source_a', 'source_b', 'source_c', 'source_d', 'source_e'];
const SOURCE_LABELS = {
  source_a: 'Source A — Hospital CRM',
  source_b: 'Source B — Lab System',
  source_c: 'Source C — Pharmacy',
  source_d: 'Source D — Insurance',
  source_e: 'Source E — Emergency',
};

const EMPTY_FORM = {
  first_name: '', last_name: '', dob: '', phone: '', email: '',
  insurance_id: '', address: '', allergy: '', diagnosis: '', source: 'source_a'
};

// Result color config
const RESULT_CONFIG = {
  safe: { label: 'SAFE', bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  duplicate: { label: 'DUPLICATE', bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', dot: 'bg-red-500 animate-pulse' },
  review: { label: 'REVIEW', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-400' },
};

function LiveRecordRow({ entry }) {
  const cfg = RESULT_CONFIG[entry.result] || RESULT_CONFIG.review;
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${cfg.bg} text-xs animate-fade-in`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="min-w-0 flex-1">
        <span className="text-white font-medium truncate">{entry.record?.full_name || 'Unknown'}</span>
        <span className="text-slate-400 ml-2">{entry.record?.source}</span>
      </div>
      <span className={`font-bold shrink-0 ${cfg.text}`}>{cfg.label}</span>
      {entry.confidence > 0 && (
        <span className="text-slate-400 shrink-0">{Math.round(entry.confidence * 100)}%</span>
      )}
      <span className="text-slate-600 shrink-0">{entry.timestamp}</span>
    </div>
  );
}

function StatBadge({ label, value, color = 'text-cyan-400' }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 text-center">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function LiveMonitor() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  // Live feed state
  const [liveFeed, setLiveFeed] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const feedRef = useRef(null);

  // Auto-scroll live feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [liveFeed]);

  // Connect to live feed WebSocket — safe against React StrictMode double-mount
  useEffect(() => {
    let isMounted = true;
    let reconnectTimer = null;

    const connect = () => {
      if (!isMounted) return;                // Don't reconnect after unmount
      try {
        // Close any existing socket before opening a new one
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.onclose = null;      // Suppress the reconnect from the old socket
          wsRef.current.close();
        }

        const ws = new WebSocket(WS_LIVE_FEED_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setWsConnected(true);
        };

        ws.onclose = (e) => {
          if (!isMounted) return;            // Ignore close events after unmount
          setWsConnected(false);
          // Only reconnect on unexpected closes (not manual close code 1000)
          if (e.code !== 1000) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          if (isMounted) setWsConnected(false);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'live_record') {
              setLiveFeed(prev => [data, ...prev].slice(0, 80));
            }
          } catch {}
        };
      } catch {}
    };

    connect();

    // Poll ingestion stats every 5 seconds
    const pollStats = async () => {
      if (!isMounted) return;
      try {
        const { data } = await getIngestionStatus();
        if (isMounted) setLiveStats(data);
      } catch {}
    };
    pollStats();
    const interval = setInterval(pollStats, 5000);

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      clearInterval(interval);
      // Cleanly close with normal close code so the onclose handler skips reconnect
      if (wsRef.current) {
        wsRef.current.onclose = null;        // Prevent any reconnect logic from firing
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await checkDuplicate(form);
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  const handleMerge = async (match) => {
    setMerging(true);
    try {
      await approveMerge({ record_id_1: 'incoming', record_id_2: match.record_id, reason: 'Live monitor merge' });
      setResult(prev => ({ ...prev, merged: true }));
    } catch {}
    setMerging(false);
  };

  // Source breakdown for live feed
  const sourceCounts = liveFeed.reduce((acc, e) => {
    const src = e.record?.source || 'unknown';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const dupCount = liveFeed.filter(e => e.result === 'duplicate').length;
  const reviewCount = liveFeed.filter(e => e.result === 'review').length;
  const safeCount = liveFeed.filter(e => e.result === 'safe').length;

  return (
    <div className="h-screen bg-[#0a0c14] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Ingestion Monitor
          </h1>
          <p className="text-slate-400 text-sm">Real-time duplicate detection & record feed</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border
            ${wsConnected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
            <Wifi className="w-3 h-3" />
            {wsConnected ? 'Live Feed Connected' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">

        {/* ── LEFT: Submit Form ── */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" /> Submit & Check Record
            </h2>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[{ key: 'first_name', label: 'First Name' }, { key: 'last_name', label: 'Last Name' }].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                    <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              {[
                { key: 'dob', label: 'Date of Birth', placeholder: 'YYYY-MM-DD' },
                { key: 'phone', label: 'Phone', placeholder: '5551234567' },
                { key: 'email', label: 'Email', placeholder: 'patient@email.com' },
                { key: 'insurance_id', label: 'Insurance ID', placeholder: 'INS-001-XX' },
                { key: 'address', label: 'Address', placeholder: '123 Main St' },
                { key: 'allergy', label: 'Allergies', placeholder: 'Penicillin; Sulfa' },
                { key: 'diagnosis', label: 'Diagnosis', placeholder: 'Primary diagnosis' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    value={form[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Source System</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking...</> : <><Send className="w-4 h-4" />Submit & Check</>}
              </button>
            </form>
          </div>

          {/* Result panel */}
          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-3">Detection Result</h3>
              {result.error ? (
                <p className="text-red-400 text-xs">{result.error}</p>
              ) : result.is_duplicate ? (
                <div className="space-y-3">
                  <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-bold text-sm">Duplicate Detected</span>
                    </div>
                    <p className="text-3xl font-black text-red-400">
                      {Math.round((result.matches?.[0]?.confidence || 0) * 100)}%
                    </p>
                    <p className="text-xs text-red-300 mt-1">{result.latency_ms}ms response</p>
                  </div>
                  {result.matches?.map((m, i) => (
                    <div key={i} className="bg-slate-800 rounded-xl p-3 text-sm">
                      <p className="font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-slate-400">DOB: {m.dob} · {m.source}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-900 rounded p-2">{m.explanation}</p>
                      {m.counter_evidence && (
                        <p className="text-xs text-amber-400 mt-1">💡 {m.counter_evidence}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
                          onClick={() => handleMerge(m)} disabled={merging}>
                          <GitMerge className="w-3 h-3" /> Merge
                        </button>
                        <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">Override</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold text-sm">Safe to Create</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{result.candidates_evaluated} records checked · {result.latency_ms}ms</p>
                </div>
              )}
              {result.merged && (
                <div className="mt-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-sm text-emerald-400">
                  ✅ Records merged into golden record
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CENTER: Live Ingestion Feed ── */}
        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <StatBadge label="Records Today" value={liveStats?.records_today ?? liveFeed.length} color="text-cyan-400" />
            <StatBadge label="Duplicates" value={liveStats?.duplicates_caught ?? dupCount} color="text-red-400" />
            <StatBadge label="In Review" value={reviewCount} color="text-amber-400" />
            <StatBadge label="Safe" value={safeCount} color="text-emerald-400" />
          </div>

          {/* Speed & rate */}
          {liveStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-lg font-black text-yellow-400">{liveStats.records_per_second || 0}</p>
                  <p className="text-xs text-slate-400">Records/sec</p>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-lg font-black text-purple-400">{liveStats.avg_latency_ms || 0}ms</p>
                  <p className="text-xs text-slate-400">Avg Latency</p>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-lg font-black text-cyan-400">{liveStats.duplicate_catch_rate_pct || 0}%</p>
                  <p className="text-xs text-slate-400">Catch Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Live Feed */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-sm font-semibold text-white">Live Ingestion Feed</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{liveFeed.length} records</span>
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Safe</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Duplicate</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Review</span>
              </div>
            </div>
            <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {liveFeed.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-600">
                  <div className="text-center">
                    <Wifi className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{wsConnected ? 'Waiting for live records...' : 'Connecting to feed...'}</p>
                  </div>
                </div>
              ) : (
                liveFeed.map((entry, i) => <LiveRecordRow key={i} entry={entry} />)
              )}
            </div>
          </div>

          {/* Source breakdown */}
          {Object.keys(sourceCounts).length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Source Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([src, cnt]) => {
                  const total = liveFeed.length || 1;
                  const pct = Math.round((cnt / total) * 100);
                  return (
                    <div key={src} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-32 truncate">{src}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                        <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Engine Log ── */}
        <div className="col-span-4 flex flex-col min-h-0">
          <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">Engine Log</span>
            </div>
            <div className="flex-1 min-h-0 p-3">
              <EngineLog height="h-full" maxLines={120} dark />
            </div>
          </div>

          {/* Method breakdown */}
          {liveStats?.method_breakdown && (
            <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Method Breakdown</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(liveStats.method_breakdown).filter(([, v]) => v > 0).map(([method, cnt]) => (
                  <div key={method} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-400">{method.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold text-cyan-400">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
