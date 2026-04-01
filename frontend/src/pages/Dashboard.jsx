import React, { useState, useEffect } from 'react';
import {
  Users, AlertTriangle, ShieldCheck, BarChart3, ClipboardList, PlusCircle, TrendingUp, Layers
} from 'lucide-react';
import { getDashboardStats } from '../api';
import StatCard from '../components/StatCard';
import EngineLog from '../components/EngineLog';
import { Link } from 'react-router-dom';

function QualityRing({ score }) {
  const r = 36, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 85 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#F0F4F8" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold text-gray-900">{score}%</p>
        <p className="text-[9px] text-gray-500 leading-none">quality</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats?.stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white border border-gray-100 rounded-2xl p-12">
        <Layers className="w-10 h-10 text-gray-200" />
        <p className="text-gray-500 font-black text-xs uppercase tracking-widest">⚡ Engine Offline or No Data</p>
        <p className="text-gray-400 text-sm max-w-xs text-center">Import a dataset to activate the resolution engine.</p>
        <Link to="/ingest" className="btn-primary mt-4">Import Your First Dataset</Link>
      </div>
    );
  }

  const s = stats.stats;
  const cards = [
    { icon: Users, label: 'Total Records Ingested', value: s.total_records, color: 'blue', subtitle: 'Across all sources' },
    { icon: AlertTriangle, label: 'Master Entities', value: s.unified_identities, color: 'emerald', subtitle: `${s.duplicate_rate}% deduplication rate` },
    { icon: ShieldCheck, label: 'Auto Resolved', value: s.auto_merged, color: 'orange', subtitle: 'Resolved by AI engine' },
    { icon: BarChart3, label: 'Pending Reviews', value: s.pending_reviews, color: 'purple', subtitle: 'Awaiting human review' },
    { icon: ClipboardList, label: 'Attribute Conflicts', value: s.allergy_conflicts, color: 'red', subtitle: 'Field-level collisions' },
  ];

  // Ingestion live stats
  const ingestCards = [
    { label: 'Records Today', value: s.records_today ?? '—', color: 'text-cyan-600' },
    { label: 'Duplicates Caught', value: s.duplicates_today ?? '—', color: 'text-red-500' },
    { label: 'Catch Rate', value: s.duplicate_catch_rate ? `${s.duplicate_catch_rate}%` : '—', color: 'text-amber-500' },
    { label: 'Avg Latency', value: s.avg_latency_ms ? `${s.avg_latency_ms}ms` : '—', color: 'text-purple-500' },
    { label: 'Records/sec', value: s.ingestion_rps ?? '—', color: 'text-emerald-600' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Infynd Overview</h1>
        <p className="text-sm text-gray-400 mt-1 font-medium">Universal entity resolution — any dataset, any source</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Quality Score Card — special */}
        <div className="card p-5 flex items-center gap-4">
          <QualityRing score={Math.round(s.quality_score)} />
          <div>
            <p className="text-2xl font-bold text-green-700">{s.quality_score}%</p>
            <p className="text-sm font-medium text-gray-600">Data Quality Score</p>
            <p className="text-xs text-gray-400 mt-0.5">Across all golden records</p>
          </div>
        </div>
        {cards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* Ingestion Live Stats Row */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
          Live Ingestion Stats — Today
        </p>
        <div className="grid grid-cols-5 gap-4">
          {ingestCards.map((c) => (
            <div key={c.label} className="text-center">
              <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 mb-6 bg-white border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors group relative overflow-hidden">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">Import a New Dataset</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Import any CSV, Excel or DB source. Infynd will auto-detect schemas, resolve duplicates, and build Master Entities immediately.
          </p>
          <Link to="/ingest" className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Import Data Source
          </Link>
        </div>
      </div>

      {/* Methodology Section (GAP 1 & 2 Pitch) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <div className="card p-6 bg-gradient-to-br from-indigo-900 to-blue-900 text-white border-0 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <ShieldCheck className="w-32 h-32" />
          </div>
          <h3 className="text-xl font-black mb-4 flex items-center gap-2 tracking-tight uppercase">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Resolution Engine Stack
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="flex items-start gap-3">
              <div className="badge bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-[10px] mt-1 shrink-0">LSH</div>
              <div>
                <p className="font-bold text-sm leading-tight text-blue-50">Locality Sensitive Hashing</p>
                <p className="text-[10px] text-blue-200 opacity-80 mt-1 uppercase font-semibold">MinHash signature clusters for high-dimensional set similarity</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-[10px] mt-1 shrink-0">SNM</div>
              <div>
                <p className="font-bold text-sm leading-tight text-blue-50">Sorted Neighborhood Method</p>
                <p className="text-[10px] text-blue-200 opacity-80 mt-1 uppercase font-semibold">Sliding window O(n) blocking for massive clinical datasets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge bg-amber-500/20 text-amber-300 border-amber-500/30 font-mono text-[10px] mt-1 shrink-0">MET</div>
              <div>
                <p className="font-bold text-sm leading-tight text-blue-50">Phonetic Canonicalisation</p>
                <p className="text-[10px] text-blue-200 opacity-80 mt-1 uppercase font-semibold">Metaphone + Soundex tokens for cross-dialect name matching</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
           <h3 className="text-sm font-black text-gray-400 mb-4 tracking-widest uppercase flex items-center gap-2">
             <BarChart3 className="w-4 h-4" /> Processing Dynamics
           </h3>
           <div className="space-y-6">
              <div className="flex justify-between items-end">
                <p className="text-xs font-bold text-gray-500">Auto-Resolution Confidence</p>
                <p className="text-xl font-black text-primary">0.90+</p>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[90%] rounded-full" />
              </div>
              
              <div className="flex justify-between items-end">
                <p className="text-xs font-bold text-gray-500">Human-in-the-Loop Threshold</p>
                <p className="text-xl font-black text-amber-500">0.60+</p>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[60%] rounded-full" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
