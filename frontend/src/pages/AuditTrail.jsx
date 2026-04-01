import React, { useState, useEffect } from 'react';
import { Filter, ChevronDown, CheckCircle, XCircle, Scissors, ScrollText } from 'lucide-react';
import { getAuditTrail } from '../api';

const ACTION_COLORS = {
  approve_merge: { cls: 'bg-green-50 border-l-green-500', badge: 'badge-success', icon: CheckCircle, iconCls: 'text-green-600' },
  reject_merge: { cls: 'bg-red-50 border-l-red-500', badge: 'badge-danger', icon: XCircle, iconCls: 'text-red-600' },
  split_record: { cls: 'bg-amber-50 border-l-amber-400', badge: 'badge-warning', icon: Scissors, iconCls: 'text-amber-600' },
  create_golden_record: { cls: 'bg-blue-50 border-l-blue-400', badge: 'badge-primary', icon: CheckCircle, iconCls: 'text-blue-600' },
  batch_resolve: { cls: 'bg-purple-50 border-l-purple-400', badge: 'badge bg-purple-100 text-purple-700', icon: ScrollText, iconCls: 'text-purple-600' },
};

const ACTION_TYPES = ['', 'approve_merge', 'reject_merge', 'split_record', 'create_golden_record', 'batch_resolve'];

export default function AuditTrail() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({ action_type: '', date_from: '', date_to: '', min_confidence: '' });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * PAGE_SIZE, limit: PAGE_SIZE,
        action_type: filters.action_type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        min_confidence: filters.min_confidence ? parseFloat(filters.min_confidence) : undefined,
      };
      const res = await getAuditTrail(params);
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const style = (action) => ACTION_COLORS[action] || { cls: 'bg-gray-50 border-l-gray-300', badge: 'badge-gray', icon: ScrollText, iconCls: 'text-gray-500' };

  return (
    <div>
      <h1 className="page-header">Audit Trail</h1>
      <p className="page-subtitle">Complete log of all system and reviewer decisions</p>

      {/* Filters */}
      <div className="card p-4 mb-5 flex gap-3 flex-wrap">
        <select className="input-field w-48" value={filters.action_type}
          onChange={e => setFilters(p => ({ ...p, action_type: e.target.value }))}>
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <input type="date" className="input-field w-44" value={filters.date_from}
          onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
          placeholder="Date from" />
        <input type="date" className="input-field w-44" value={filters.date_to}
          onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
          placeholder="Date to" />
        <input className="input-field w-36" placeholder="Min confidence"
          type="number" min={0} max={1} step={0.1}
          value={filters.min_confidence}
          onChange={e => setFilters(p => ({ ...p, min_confidence: e.target.value }))} />
        <button onClick={() => { setPage(0); load(); }} className="btn-primary flex items-center gap-2">
          <Filter className="w-4 h-4" /> Apply
        </button>
      </div>

      <div className="mb-3 text-sm text-gray-500">{total} audit entries total</div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-6 gap-3 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span className="col-span-1">Timestamp</span>
            <span className="col-span-1">Action</span>
            <span className="col-span-2">Records</span>
            <span>Confidence</span>
            <span>Rule</span>
          </div>

          {entries.map((e, i) => {
            const s = style(e.action_type);
            const Icon = s.icon;
            const isExpanded = expanded === i;
            return (
              <div key={i} className={`card border-l-4 ${s.cls} overflow-hidden animate-fade-in`}>
                <div className="grid grid-cols-6 gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : i)}>
                  <span className="text-xs text-gray-500 col-span-1">
                    {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                  </span>
                  <div className="flex items-center gap-2 col-span-1">
                    <Icon className={`w-4 h-4 shrink-0 ${s.iconCls}`} />
                    <span className={`badge text-[10px] font-bold ${s.badge}`}>
                      {e.action_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-700 font-mono col-span-2 truncate">
                    {Array.isArray(e.record_ids) ? e.record_ids.join(', ') : e.record_ids}
                  </span>
                  <span className="text-xs font-semibold">
                    {e.confidence_score ? `${(e.confidence_score * 100).toFixed(0)}%` : '—'}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate">{e.rule_fired || '—'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-gray-100 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Reviewer Note</p>
                        <p className="text-sm text-gray-700">{e.reviewer_note || 'No note'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Details</p>
                        <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-auto max-h-24">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No audit entries found</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-outline text-sm">Previous</button>
          <span className="text-sm text-gray-500 flex items-center">Page {page + 1}</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} className="btn-outline text-sm">Next</button>
        </div>
      )}
    </div>
  );
}
