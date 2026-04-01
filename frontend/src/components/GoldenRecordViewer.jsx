import React, { useState } from 'react';
import { X, Shield, Database, GitMerge, Clock, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { deleteEntity } from '../api';

const TABS = ['Overview', 'Source Records', 'Merge History', 'Timeline', 'Conflicts'];

export default function GoldenRecordViewer({ record, onClose }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [erasing, setErasing] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState(false);

  const handleGdprErase = async () => {
    if (!eraseConfirm) {
      setEraseConfirm(true);
      return;
    }
    setErasing(true);
    try {
      await deleteEntity(record.patient_id);
      onClose();
    } catch (e) {
      console.error('GDPR erasure failed:', e);
      setErasing(false);
      setEraseConfirm(false);
    }
  };

  if (!record) return null;

  const quality = record.data_quality_score || 0;
  const qualityColor = quality >= 85 ? 'text-green-600 bg-green-50' : quality >= 70 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  const fieldSources = record.field_sources || {};

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-primary to-primary-400">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-5 h-5 opacity-80" />
              <h2 className="text-xl font-bold">{record.full_name || 'Unknown Patient'}</h2>
              <span className={`badge text-xs px-2 py-0.5 rounded-full font-bold ${qualityColor}`}>
                {quality}% quality
              </span>
            </div>
            <p className="text-primary-100 text-sm">
              {record.patient_id} · Resolved from {record.sources_count || 1} source{record.sources_count !== 1 ? 's' : ''} ·
              Updated {record.last_updated ? new Date(record.last_updated).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {eraseConfirm ? (
              <div className="flex items-center gap-2 bg-red-900/40 rounded-lg px-3 py-1.5">
                <span className="text-white text-xs font-semibold">Confirm GDPR erasure?</span>
                <button onClick={handleGdprErase} disabled={erasing}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold hover:bg-red-400">
                  {erasing ? 'Erasing...' : 'Yes, Delete All'}
                </button>
                <button onClick={() => setEraseConfirm(false)} className="text-white/60 hover:text-white text-xs">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={handleGdprErase}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white px-3 py-1.5 rounded-lg transition-all border border-white/20"
                title="GDPR Right to Erasure — delete all instances of this entity">
                <Trash2 className="w-3.5 h-3.5" /> GDPR Erase
              </button>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 px-6 bg-white">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'Overview' && (
            <div>
              <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                <span>Field</span><span>Value</span><span>Source</span><span>Confidence</span>
              </div>
              {fields.map(({ key, label, critical }) => {
                const fs = fieldSources[key] || {};
                const val = record[key] || fs.value || '—';
                const src = fs.source || '—';
                const conf = fs.confidence ? `${(fs.confidence * 100).toFixed(0)}%` : '—';
                return (
                  <div
                    key={key}
                    className={`grid grid-cols-4 gap-2 px-3 py-2.5 rounded-lg mb-1 text-sm ${
                      critical ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <span className={`font-medium ${critical ? 'text-red-700 flex items-center gap-1' : 'text-gray-600'}`}>
                      {critical && <AlertTriangle className="w-3.5 h-3.5" />}
                      {label}
                    </span>
                    <span className={`font-medium ${critical ? 'text-red-800' : 'text-gray-900'} truncate`} title={val}>{val}</span>
                    <span className="text-gray-500">{src}</span>
                    <span className={`font-semibold ${conf === '100%' ? 'text-green-600' : parseInt(conf) >= 80 ? 'text-amber-600' : 'text-gray-500'}`}>{conf}</span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'Source Records' && (
            <div className="space-y-4">
              {(record.source_records || []).map((sr, i) => (
                <div key={i} className="card p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge badge-primary">{sr.source}</span>
                    <span className="text-xs text-gray-400">Updated: {sr.last_updated}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {['first_name', 'last_name', 'dob', 'phone', 'email', 'insurance_id', 'address', 'allergy'].map(f => (
                      <div key={f}>
                        <span className="text-xs text-gray-400 capitalize">{f.replace('_', ' ')}: </span>
                        <span className="text-gray-800 font-medium">{sr[f] || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(!record.source_records || record.source_records.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-8">No source records attached yet</p>
              )}
            </div>
          )}

          {activeTab === 'Merge History' && (
            <div className="space-y-3">
              {(record.timeline || []).map((v, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-xs font-bold text-primary">
                      v{v.version}
                    </div>
                    {i < (record.timeline.length - 1) && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{v.change_type}</p>
                    <p className="text-xs text-gray-500">{v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}</p>
                    {v.changed_fields?.map((cf, j) => (
                      <p key={j} className="text-xs text-gray-600 mt-1">
                        {cf.field}: {cf.old_value || 'N/A'} → {cf.new_value}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {(!record.timeline || record.timeline.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-8">No history recorded yet</p>
              )}
            </div>
          )}

          {activeTab === 'Timeline' && (
            <p className="text-gray-400 text-sm text-center py-8">
              Open the Entity Timeline page and search for <strong>{record.full_name}</strong> for a visual timeline.
            </p>
          )}

          {activeTab === 'Conflicts' && (
            <div className="space-y-2">
              {(record.field_sources ? Object.entries(record.field_sources) : []).map(([key, fs]) => {
                if (!fs?.merge_strategy || fs.merge_strategy === 'none') return null;
                return (
                  <div key={key} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800 capitalize">{key.replace('_', ' ')}</span>
                      <span className="text-xs badge badge-warning">{fs.merge_strategy}</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">Winner: <strong>{fs.source}</strong> → {fs.value}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
