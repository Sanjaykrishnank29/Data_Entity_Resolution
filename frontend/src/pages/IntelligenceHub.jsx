import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ChevronRight, Filter, Sliders } from 'lucide-react';
import { getCandidatePairs, approveMerge, rejectMerge } from '../api';

const API = 'http://127.0.0.1:8001';

function PriorityTag({ type }) {
  const map = {
    ALLERGY: { cls: 'bg-red-100 text-red-700 border-red-300', label: '🚨 ALLERGY' },
    CRITICAL: { cls: 'bg-red-100 text-red-700 border-red-300', label: '🔴 CRITICAL' },
    HIGH: { cls: 'bg-orange-100 text-orange-700 border-orange-300', label: '🟠 HIGH' },
    MEDIUM: { cls: 'bg-amber-100 text-amber-700 border-amber-300', label: '🟡 MEDIUM' },
    LOW: { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: '⚪ LOW' },
  };
  const m = map[type] || map.LOW;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.cls}`}>{m.label}</span>;
}

function SignalBar({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-bold w-8 text-right ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
    </div>
  );
}

export default function IntelligenceHub() {
  const [pairs, setPairs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [threshold, setThreshold] = useState(0.60);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [reason, setReason] = useState('');
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [ruleBuilderOpen, setRuleBuilderOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCandidatePairs({ min_confidence: threshold, status: 'pending', limit: 100 });
      const raw = res.data.pairs || [];
      // Sort allergy conflicts first
      const sorted = [...raw].sort((a, b) => {
        const aP = a.has_allergy_conflict ? 3 : a.confidence >= 0.9 ? 2 : a.confidence >= 0.7 ? 1 : 0;
        const bP = b.has_allergy_conflict ? 3 : b.confidence >= 0.9 ? 2 : b.confidence >= 0.7 ? 1 : 0;
        return bP - aP || b.confidence - a.confidence;
      });
      setPairs(sorted);
      if (sorted.length && !selected) setSelected(sorted[0]);
    } catch { setPairs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [threshold]);

  const getPriority = (pair) => {
    if (pair.has_allergy_conflict) return 'ALLERGY';
    if (pair.confidence >= 0.9) return 'CRITICAL';
    if (pair.confidence >= 0.75) return 'HIGH';
    if (pair.confidence >= 0.6) return 'MEDIUM';
    return 'LOW';
  };

  const filteredPairs = filterPriority === 'ALL' ? pairs : pairs.filter(p => getPriority(p) === filterPriority);

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await approveMerge({ record_id_1: selected.record_id_1, record_id_2: selected.record_id_2, reason: reason || 'Approved from Intelligence Hub' });
      setActionResult({ type: 'success', msg: `✅ Merged: ${selected.record_1?.first_name} ${selected.record_1?.last_name}` });
      const remaining = pairs.filter(p => p.id !== selected.id);
      setPairs(remaining);
      setSelected(remaining[0] || null);
      setReason('');
    } catch { setActionResult({ type: 'error', msg: 'Failed to approve. Try again.' }); }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await rejectMerge({ record_id_1: selected.record_id_1, record_id_2: selected.record_id_2, reason: reason || 'Rejected from Intelligence Hub' });
      setActionResult({ type: 'warning', msg: `❌ Rejected pair` });
      const remaining = pairs.filter(p => p.id !== selected.id);
      setPairs(remaining);
      setSelected(remaining[0] || null);
      setReason('');
    } catch { setActionResult({ type: 'error', msg: 'Failed to reject.' }); }
    setActionLoading(false);
  };

  const handleBulkApprove = async () => {
    const toApprove = pairs.filter(p => bulkSelected.has(p.id));
    for (const pair of toApprove) {
      try { await approveMerge({ record_id_1: pair.record_id_1, record_id_2: pair.record_id_2, reason: 'Bulk approved' }); } catch {}
    }
    setBulkSelected(new Set());
    load();
  };

  const sel = selected ? (pairs.find(p => p.id === selected.id) || selected) : null;

  const CONFIDENCE_PCT = sel ? Math.round(sel.confidence * 100) : 0;
  const FIELDS = [
    { label: 'First Name', k: 'first_name' },
    { label: 'Last Name', k: 'last_name' },
    { label: 'Date of Birth', k: 'dob', signal: 'dob' },
    { label: 'Phone', k: 'phone', signal: 'phone' },
    { label: 'Email', k: 'email', signal: 'email' },
    { label: 'Insurance ID', k: 'insurance_id', signal: 'insurance' },
    { label: 'Allergies', k: 'allergy', critical: true },
    { label: 'Address', k: 'address', signal: 'address' },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🧠 Intelligence Hub</h1>
          <p className="text-sm text-gray-500 mt-1">AI-assisted conflict resolution with full explainability</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRuleBuilderOpen(!ruleBuilderOpen)} className="btn-outline flex items-center gap-2 text-xs">
            <Sliders className="w-3 h-3" /> Rule Builder
          </button>
          {bulkSelected.size > 0 && (
            <button onClick={handleBulkApprove} className="btn-success text-xs">
              Bulk Approve ({bulkSelected.size})
            </button>
          )}
        </div>
      </div>

      {actionResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold animate-slide-down ${
          actionResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          actionResult.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>{actionResult.msg}</div>
      )}

      {/* Rule Builder */}
      {ruleBuilderOpen && (
        <div className="card p-4 mb-4 bg-gray-50">
          <h3 className="font-black text-sm text-gray-800 mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4" /> Visual Rule Builder
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-gray-600">IF</span>
            <select className="input-field w-auto text-xs py-1.5">
              <option>Confidence Score</option><option>Name Match</option><option>Insurance ID</option><option>DOB Match</option>
            </select>
            <select className="input-field w-auto text-xs py-1.5">
              <option>≥</option><option>≤</option><option>==</option>
            </select>
            <input type="number" defaultValue={90} className="input-field w-16 text-xs py-1.5" />
            <span className="text-sm font-bold text-gray-600">THEN</span>
            <select className="input-field w-auto text-xs py-1.5">
              <option>Auto Approve</option><option>Send to Review</option><option>Auto Reject</option>
            </select>
            <button className="btn-primary text-xs py-1.5">Save Rule</button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card p-4 mb-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-600 shrink-0">Threshold</span>
          <input type="range" min={0.5} max={1} step={0.01} value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            className="w-40" />
          <span className="text-sm font-black text-red-600 w-10">{Math.round(threshold * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-gray-400" />
          {['ALL', 'ALLERGY', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
            <button key={f} onClick={() => setFilterPriority(f)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${filterPriority === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{filteredPairs.length} pairs in queue</span>
      </div>

      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-280px)]">
        {/* Queue Panel */}
        <div className="col-span-2 card overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
            Priority Queue
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-5 h-5 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
              </div>
            ) : filteredPairs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                <CheckCircle className="w-8 h-8 mb-2 text-green-300" />
                No items above {Math.round(threshold * 100)}% threshold
              </div>
            ) : filteredPairs.map(pair => (
              <div key={pair.id}
                onClick={() => setSelected(pair)}
                className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${sel?.id === pair.id ? 'bg-red-50 border-l-3 border-red-500' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="checkbox" checked={bulkSelected.has(pair.id)}
                    onChange={e => { e.stopPropagation(); setBulkSelected(prev => { const n = new Set(prev); n.has(pair.id) ? n.delete(pair.id) : n.add(pair.id); return n; }); }}
                    className="shrink-0" />
                  <span className="font-semibold text-xs text-gray-900 truncate">
                    {pair.record_1?.first_name} {pair.record_1?.last_name}
                  </span>
                  <span className={`ml-auto text-xs font-black shrink-0 ${CONFIDENCE_PCT >= 90 ? 'text-red-600' : 'text-amber-600'}`}>
                    {Math.round(pair.confidence * 100)}%
                  </span>
                </div>
                <div className="pl-5 flex items-center gap-1 flex-wrap">
                  <PriorityTag type={getPriority(pair)} />
                  <span className="text-[10px] text-gray-400">↔ {pair.record_2?.first_name} {pair.record_2?.last_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-3 card p-5 flex flex-col overflow-y-auto">
          {sel ? (
            <>
              {/* Confidence */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-black text-gray-900 text-base">
                    {sel.record_1?.first_name} {sel.record_1?.last_name}
                    <span className="text-gray-400 mx-2">↔</span>
                    {sel.record_2?.first_name} {sel.record_2?.last_name}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{sel.explanation}</p>
                </div>
                <div className="text-center shrink-0 ml-4">
                  <p className={`text-3xl font-black ${CONFIDENCE_PCT >= 90 ? 'text-red-600' : CONFIDENCE_PCT >= 70 ? 'text-amber-600' : 'text-gray-600'}`}>
                    {CONFIDENCE_PCT}%
                  </p>
                  <p className="text-xs text-gray-400">Confidence</p>
                </div>
              </div>

              {/* Allergy alert */}
              {sel.has_allergy_conflict && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-red-700">🚨 CRITICAL ALLERGY CONFLICT — DO NOT DISCARD</p>
                    <p className="text-xs text-red-600 mt-0.5">Conflicting allergy information detected. Review carefully before merging.</p>
                  </div>
                </div>
              )}

              {/* Signal Breakdown */}
              {sel.signal_breakdown && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Confidence Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(sel.signal_breakdown).map(([k, v]) => (
                      <SignalBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} />
                    ))}
                  </div>
                </div>
              )}

              {/* Field Comparison */}
              <div className="space-y-1 mb-4">
                {FIELDS.map(({ label, k, critical }) => {
                  const v1 = sel.record_1?.[k] || sel.record_1?.[`norm_${k}`] || '—';
                  const v2 = sel.record_2?.[k] || sel.record_2?.[`norm_${k}`] || '—';
                  const match = v1 === v2 && v1 !== '—';
                  const missing = v1 === '—' || v2 === '—';
                  return (
                    <div key={k} className={`grid grid-cols-3 gap-2 px-3 py-2 rounded-lg text-sm ${
                      critical ? 'bg-red-50' : match ? 'bg-green-50' : missing ? 'bg-gray-50' : 'bg-red-50'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${critical ? 'text-red-600' : 'text-gray-500'}`}>{label}</span>
                      <span className="text-gray-800 font-medium text-xs">{v1}</span>
                      <span className="text-gray-800 font-medium text-xs">{v2}</span>
                    </div>
                  );
                })}
              </div>

              {/* Reason + Buttons */}
              <div className="mt-auto space-y-3">
                <textarea
                  placeholder="Add reason for your decision (optional)..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black/10 resize-none h-16"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading ? 'Processing...' : 'Approve Merge'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Select a pair from the queue to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
