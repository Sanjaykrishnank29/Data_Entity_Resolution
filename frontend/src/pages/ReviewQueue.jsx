import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getCandidatePairs, approveMerge, rejectMerge } from '../api';
import PrecisionSlider from '../components/PrecisionSlider';

function PriorityTag({ type }) {
  const map = {
    allergy_conflict: { label: 'ALLERGY', cls: 'bg-red-100 text-red-700 border border-red-300' },
    mismatch: { label: 'CONFLICT', cls: 'bg-amber-100 text-amber-700 border border-amber-300' },
    default: { label: 'REVIEW', cls: 'bg-gray-100 text-gray-600' },
  };
  const m = map[type] || map.default;
  return <span className={`badge text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
}

export default function ReviewQueue() {
  const [pairs, setPairs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [threshold, setThreshold] = useState(0.60);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCandidatePairs({ min_confidence: threshold, status: 'pending', limit: 100 });
      setPairs(res.data.pairs || []);
    } catch {
      setPairs([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [threshold]);

  const allergyFirst = [...pairs].sort((a, b) => {
    const aAllergy = a.has_allergy_conflict ? 1 : 0;
    const bAllergy = b.has_allergy_conflict ? 1 : 0;
    return bAllergy - aAllergy || b.confidence - a.confidence;
  });

  const sel = allergyFirst.find(p => p.id === selected?.id) || allergyFirst[0];

  const handleQuickApprove = async (pair) => {
    if (!pair) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      await approveMerge({ record_id_1: pair.record_id_1, record_id_2: pair.record_id_2, reason: 'Quick approved from queue' });
      setActionResult({ type: 'success', msg: `✅ Merged: ${pair.record_1?.first_name} ${pair.record_1?.last_name}` });
      // Remove from queue
      setPairs(prev => prev.filter(p => p.id !== pair.id));
      setSelected(null);
    } catch (e) {
      setActionResult({ type: 'error', msg: '❌ Failed to approve merge' });
    }
    setActionLoading(false);
  };

  const handleQuickReject = async (pair) => {
    if (!pair) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      await rejectMerge({ record_id_1: pair.record_id_1, record_id_2: pair.record_id_2, reason: 'Quick rejected from queue' });
      setActionResult({ type: 'warning', msg: `❌ Rejected: ${pair.record_1?.first_name} ${pair.record_1?.last_name}` });
      setPairs(prev => prev.filter(p => p.id !== pair.id));
      setSelected(null);
    } catch (e) {
      setActionResult({ type: 'error', msg: '❌ Failed to reject' });
    }
    setActionLoading(false);
  };

  const handleQuickSplit = async (pair) => {
    if (!pair) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      await splitRecord({ golden_record_id: pair.record_id_1, reason: 'Quick split from queue' });
      setActionResult({ type: 'error', msg: `✂️ Split: ${pair.record_1?.first_name} ${pair.record_1?.last_name}` });
      setPairs(prev => prev.filter(p => p.id !== pair.id));
      setSelected(null);
    } catch (e) {
      setActionResult({ type: 'error', msg: '❌ Failed to split' });
    }
    setActionLoading(false);
  };

  return (
    <div>
      <h1 className="page-header">Review Queue</h1>
      <p className="page-subtitle">Human-in-the-loop review for uncertain matches</p>

      <div className="card p-4 mb-4">
        <PrecisionSlider value={threshold} onChange={setThreshold} />
      </div>

      {actionResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold animate-fade-in ${
          actionResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          actionResult.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {actionResult.msg}
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-300px)]">
        {/* Queue list */}
        <div className="col-span-2 card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Queue <span className="badge badge-primary ml-1">{pairs.length}</span>
            </span>
            <button onClick={load} className="text-xs text-primary hover:underline">Refresh</button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : allergyFirst.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                No pairs above {Math.round(threshold * 100)}% threshold
              </div>
            ) : allergyFirst.map(pair => (
              <div key={pair.id}
                onClick={() => { setSelected(pair); }}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === pair.id ? 'bg-primary-50 border-l-2 border-primary' : ''}`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {pair.record_1?.first_name} {pair.record_1?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      ↔ {pair.record_2?.first_name} {pair.record_2?.last_name}
                    </p>
                  </div>
                  <span className={`badge font-bold text-xs ml-2 shrink-0 ${
                    pair.confidence >= 0.9 ? 'badge-danger' : pair.confidence >= 0.75 ? 'badge-warning' : 'badge-gray'
                  }`}>
                    {Math.round(pair.confidence * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {pair.has_allergy_conflict && <PriorityTag type="allergy_conflict" />}
                  {(pair.conflict_fields || []).slice(0, 2).map((cf, i) => (
                    <PriorityTag key={i} type={cf?.type || 'mismatch'} />
                  ))}
                  <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-3 card p-5">
          {sel ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {sel.record_1?.first_name} {sel.record_1?.last_name} ↔ {sel.record_2?.first_name} {sel.record_2?.last_name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">{sel.explanation}</p>
                </div>
                <span className={`text-2xl font-black ${sel.confidence >= 0.9 ? 'text-red-600' : sel.confidence >= 0.75 ? 'text-amber-600' : 'text-gray-600'}`}>
                  {Math.round(sel.confidence * 100)}%
                </span>
              </div>

              {sel.has_allergy_conflict && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700 font-semibold">⚠️ ALLERGY CONFLICT — Requires careful review</p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {[
                  { f: 'first_name', label: 'First Name' },
                  { f: 'last_name', label: 'Last Name' },
                  { f: 'dob', label: 'Date of Birth' },
                  { f: 'phone', label: 'Phone' },
                  { f: 'email', label: 'Email' },
                  { f: 'insurance_id', label: 'Insurance ID' },
                  { f: 'allergy', label: 'Allergies', critical: true },
                ].map(({ f, label, critical }) => {
                  const v1 = sel.record_1?.[f] || sel.record_1?.[`norm_${f}`] || '—';
                  const v2 = sel.record_2?.[f] || sel.record_2?.[`norm_${f}`] || '—';
                  const match = v1 === v2 && v1 !== '—';
                  return (
                    <div key={f} className={`grid grid-cols-3 gap-3 px-3 py-2 rounded-lg text-sm ${
                      critical ? 'bg-red-50' : match ? 'bg-green-50' : v1 !== '—' && v2 !== '—' ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${critical ? 'text-red-600' : 'text-gray-500'}`}>{label}</span>
                      <span className="text-gray-800 font-medium">{v1}</span>
                      <span className="text-gray-800 font-medium">{v2}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  className="btn-success flex items-center gap-2"
                  onClick={() => navigate(`/review/${sel.id}`)}>
                  Full Review
                </button>
                <button
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  onClick={() => handleQuickApprove(sel)}
                  disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4" />
                  {actionLoading ? 'Processing...' : 'Quick Approve'}
                </button>
                <button
                  className="btn-danger flex items-center gap-2"
                  onClick={() => handleQuickReject(sel)}
                  disabled={actionLoading}>
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  className="btn-warning flex items-center gap-2"
                  onClick={() => handleQuickSplit(sel)}
                  disabled={actionLoading}>
                  <Scissors className="w-4 h-4" />
                  Split
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Select a pair from the queue to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
