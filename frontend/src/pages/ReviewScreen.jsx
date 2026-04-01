import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Scissors, AlertTriangle, ArrowLeft } from 'lucide-react';
import { getCandidatePairs, approveMerge, rejectMerge, splitRecord } from '../api';
import ConflictRow from '../components/ConflictRow';
import PrecisionSlider from '../components/PrecisionSlider';

export default function ReviewScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pair, setPair] = useState(null);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [threshold, setThreshold] = useState(0.60);

  useEffect(() => {
    getCandidatePairs({ limit: 200 }).then(res => {
      const found = res.data.pairs?.find(p => String(p.id) === String(id));
      setPair(found || res.data.pairs?.[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleAction = async (type) => {
    if (!pair) return;
    setSubmitting(true);
    try {
      if (type === 'approve') {
        await approveMerge({ record_id_1: pair.record_id_1, record_id_2: pair.record_id_2, reason });
      } else if (type === 'reject') {
        await rejectMerge({ record_id_1: pair.record_id_1, record_id_2: pair.record_id_2, reason });
      } else if (type === 'split') {
        // For split we need a golden record ID — use first matching golden record or the pair ID
        await splitRecord({ golden_record_id: pair.record_id_1, reason });
      }
      navigate('/review-queue');
    } catch (e) {
      console.error('Action failed:', e);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!pair) return <div className="p-6 text-gray-500">Pair not found</div>;

  const r1 = pair.record_1 || {};
  const r2 = pair.record_2 || {};
  const fields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'insurance_id', label: 'Insurance ID' },
    { key: 'address', label: 'Address' },
    { key: 'allergy', label: 'Allergies', critical: true },
    { key: 'diagnosis', label: 'Diagnosis' },
  ];

  const confColor = pair.confidence >= 0.9 ? 'text-green-600' : pair.confidence >= 0.75 ? 'text-amber-600' : pair.confidence >= 0.6 ? 'text-orange-600' : 'text-red-600';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/review-queue')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </button>
          <h1 className="page-header">Review Decision</h1>
        </div>
        <div className="text-right">
          <p className={`text-5xl font-black ${confColor}`}>{Math.round(pair.confidence * 100)}%</p>
          <p className="text-sm text-gray-500 mt-1">Match Confidence</p>
          <p className="text-xs font-mono text-gray-400 mt-1">{pair.explanation}</p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <PrecisionSlider value={threshold} onChange={setThreshold} />
      </div>

      {pair.has_allergy_conflict && (
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <p className="font-bold text-red-700">⚠️ CRITICAL ALLERGY CONFLICT</p>
            <p className="text-sm text-red-600">Allergy values differ between sources. DO NOT DISCARD any value — merge all.</p>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-3 gap-2 px-3 py-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Field</span>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{r1.source || 'Record 1'}</span>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{r2.source || 'Record 2'}</span>
        </div>
        {fields.map(({ key, label, critical }) => {
          const v1 = r1[key] || '—';
          const v2 = r2[key] || '—';
          const match = v1 !== '—' && v2 !== '—' && v1.toLowerCase() === v2.toLowerCase();
          return (
            <ConflictRow key={key} field={label} value1={v1} value2={v2}
              isAllergy={critical} match={match} />
          );
        })}
      </div>

      {/* Action Panel */}
      <div className="card p-5">
        {action ? (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {action === 'approve' ? '✅ Approving merge...' : action === 'reject' ? '❌ Rejecting merge...' : '✂️ Splitting record...'}
            </p>
            <textarea
              className="input-field mb-3 resize-none"
              rows={2}
              placeholder="Optional: Add reason or note..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => handleAction(action)} disabled={submitting}
                className={`${action === 'approve' ? 'btn-success' : action === 'reject' ? 'btn-danger' : 'btn-warning'} flex items-center gap-2`}>
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Confirm {action}
              </button>
              <button onClick={() => setAction(null)} className="btn-outline">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <button onClick={() => setAction('approve')} className="btn-success flex items-center gap-2 flex-1 justify-center py-3">
              <CheckCircle className="w-5 h-5" /> ✅ Approve Merge
            </button>
            <button onClick={() => setAction('reject')} className="btn-danger flex items-center gap-2 flex-1 justify-center py-3">
              <XCircle className="w-5 h-5" /> ❌ Reject
            </button>
            <button onClick={() => setAction('split')} className="btn-warning flex items-center gap-2 flex-1 justify-center py-3">
              <Scissors className="w-5 h-5" /> ✂️ Split
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
