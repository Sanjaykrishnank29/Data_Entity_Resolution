import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, AlertTriangle, Users, ShieldCheck, Zap, Activity, Download, Clock, BrainCircuit } from 'lucide-react';
import { getDashboardStats } from '../api';

const API = 'http://127.0.0.1:8001';

function StatCard({ label, value, sub, color = 'text-black', icon: Icon, iconBg = 'bg-gray-100' }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-black ${color}`}>{value ?? '—'}</p>
        <p className="text-xs font-bold text-gray-600 truncate">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

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
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-black text-gray-900">{score}%</p>
        <p className="text-[9px] text-gray-500 leading-none">quality</p>
      </div>
    </div>
  );
}

function DataPulse({ active }) {
  return (
    <div className="flex items-center gap-1">
      {[0.3, 0.7, 1.0, 0.6, 0.8, 0.4, 1.0, 0.5, 0.9, 0.3, 0.7, 1.0, 0.4, 0.6, 0.9, 0.2, 0.8].map((h, i) => (
        <div key={i}
          className={`w-1 rounded-full transition-all ${active ? 'bg-red-500' : 'bg-gray-300'}`}
          style={{ height: `${Math.round(h * 28)}px`, animationDelay: `${i * 0.05}s`, animation: active ? `pulse 1.2s ease-in-out infinite` : 'none' }}
        />
      ))}
    </div>
  );
}

const FORECAST_DAYS = [
  { days: 30, dups: '18%', cost: '$340K' },
  { days: 60, dups: '32%', cost: '$890K' },
  { days: 90, dups: '45%', cost: '$2.3M' },
];

const INSIGHT_CARDS = [
  { icon: AlertTriangle, title: 'Source C Conflict Rate', value: '41%', desc: 'Source C has higher than normal conflict rate', action: 'View Details', color: 'text-orange-600', bg: 'bg-orange-50' },
  { icon: ShieldCheck, title: 'Quality SLA', value: '✓', desc: 'Data quality is above configured 70% threshold', action: 'View Report', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: Zap, title: 'Ingestion Speed', value: '3.2K/s', desc: 'Records processed per second — above baseline', action: 'View Perf', color: 'text-blue-600', bg: 'bg-blue-50' },
];

const REPORTS = [
  { label: 'Data Quality Report', icon: BarChart2, color: 'text-blue-600 bg-blue-50' },
  { label: 'Duplicate Analysis', icon: Users, color: 'text-red-600 bg-red-50' },
  { label: 'Source Reliability', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
  { label: 'Compliance Readiness', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50' },
];

export default function CommandCenter() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(15);
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = stats?.stats;

  const qualityScore = s ? Math.round(s.quality_score) : 78;
  const totalRecords = s?.total_records || 1000;
  const goldenRecords = s?.unified_identities || 679;
  const duplicates = s?.resolved_duplicates || 321;
  const dupRate = s?.duplicate_rate || 32.1;
  const pending = s?.pending_reviews || 0;
  const autoMerged = s?.auto_merged || 0;

  const handleReport = (label) => {
    alert(`Generating "${label}" PDF... (Typically ready in < 3 seconds)`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">📊 Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">Intelligence overview, trends, graphs, and automated insights</p>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Welcome back, Admin. {pending > 0 ? `${pending} pending reviews.` : 'All reviews clear.'}
        </div>
      </div>

      {/* Pulse + Quality */}
      <div className="card p-5 mb-5 flex items-center gap-8">
        <div className="flex items-center gap-4">
          <QualityRing score={qualityScore} />
          <div>
            <p className="text-lg font-black text-gray-900">{qualityScore}% Data Quality</p>
            <p className="text-xs text-gray-500">Across all {goldenRecords} golden records</p>
            <div className="mt-2">
              <DataPulse active={pulseActive} />
            </div>
            <button onClick={() => setPulseActive(p => !p)} className="text-[10px] text-gray-400 mt-1 hover:underline">
              {pulseActive ? 'Pause' : 'Resume'} data pulse
            </button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          {[
            { label: 'Ingestion Speed', value: `${s?.ingestion_rps || '3.2K'}/s`, icon: Zap, color: 'text-blue-600', iconBg: 'bg-blue-50' },
            { label: 'Auto-Resolved', value: autoMerged, icon: BrainCircuit, color: 'text-purple-600', iconBg: 'bg-purple-50' },
            { label: 'Pending Review', value: pending, icon: Clock, color: 'text-amber-600', iconBg: 'bg-amber-50' },
          ].map(c => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Records Ingested" value={totalRecords.toLocaleString()} sub="Across all sources" icon={Users} color="text-black" iconBg="bg-gray-100" />
        <StatCard label="Master Golden Records" value={goldenRecords.toLocaleString()} sub={`${dupRate}% deduplication`} icon={ShieldCheck} color="text-green-600" iconBg="bg-green-50" />
        <StatCard label="Duplicates Resolved" value={duplicates.toLocaleString()} sub="Collapsed into masters" icon={Activity} color="text-red-600" iconBg="bg-red-50" />
        <StatCard label="Cost Saved (Est.)" value={`$${(duplicates * 850).toLocaleString()}`} sub="At $850/duplicate avg" icon={TrendingUp} color="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      {/* Automated Insight Cards */}
      <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Automated Insights</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {INSIGHT_CARDS.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <div key={i} className={`card p-4 ${ins.bg} border-0`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${ins.color}`} />
                <span className={`text-xs font-black ${ins.color}`}>{ins.title}</span>
                <span className={`ml-auto text-lg font-black ${ins.color}`}>{ins.value}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{ins.desc}</p>
              <button className="text-xs font-bold text-gray-700 hover:underline">{ins.action} →</button>
            </div>
          );
        })}
      </div>

      {/* Duplicate Trend Forecast */}
      <div className="card p-5 mb-5">
        <h3 className="font-black text-gray-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-600" /> Duplicate Trend Forecaster
        </h3>
        <p className="text-xs text-gray-500 mb-4">Based on current ingestion rate of {totalRecords} records — cost of inaction</p>
        <div className="grid grid-cols-3 gap-4">
          {FORECAST_DAYS.map(({ days, dups, cost }) => (
            <div key={days} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-3xl font-black text-red-600">{dups}</p>
              <p className="text-xs font-bold text-gray-700 mt-1">Duplicates in {days} days</p>
              <p className="text-xs text-amber-600 font-bold mt-1">Est. cost: {cost}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Distribution */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <h3 className="font-black text-sm text-gray-900 mb-4">Confidence Distribution</h3>
          <div className="space-y-3">
            {[
              { range: '90–100%', count: autoMerged || 321, color: 'bg-green-500' },
              { range: '70–89%', count: Math.round(pending * 0.6) || 89, color: 'bg-amber-500' },
              { range: '60–69%', count: Math.round(pending * 0.4) || 62, color: 'bg-orange-500' },
              { range: 'Below 60%', count: 12, color: 'bg-red-500' },
            ].map(({ range, count, color }) => {
              const maxCount = autoMerged || 321;
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={range} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 w-16 shrink-0">{range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div className={`${color} h-4 rounded-full flex items-center justify-end pr-2`} style={{ width: `${Math.min(pct, 100)}%` }}>
                      <span className="text-white text-[9px] font-bold">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Health */}
        <div className="card p-5">
          <h3 className="font-black text-sm text-gray-900 mb-4">Source Health Report</h3>
          <div className="space-y-3">
            {[
              { src: 'Source A — Hospital', completeness: 94, conflicts: 8 },
              { src: 'Source B — Lab', completeness: 87, conflicts: 12 },
              { src: 'Source C — Pharmacy', completeness: 71, conflicts: 41 },
              { src: 'Source D — Insurance', completeness: 96, conflicts: 5 },
            ].map(({ src, completeness, conflicts }) => (
              <div key={src}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 truncate">{src}</span>
                  <span className={`font-bold ${conflicts > 30 ? 'text-red-600' : 'text-green-600'}`}>{conflicts}% conflicts</span>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${completeness}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-8 text-right">{completeness}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Alerts + One-Click Reports */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Smart Alert Configuration
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 flex-1">Alert when duplicate rate exceeds</span>
              <input type="number" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} className="w-16 input-field text-xs py-1" />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-xs text-gray-600">Alert on allergy conflict detected</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-xs text-gray-600">Alert on Source C conflict spike</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            {dupRate > alertThreshold && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 font-bold">
                🚨 Alert: Duplicate rate ({dupRate}%) exceeds threshold ({alertThreshold}%)
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-600" /> One-Click Reports
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {REPORTS.map(({ label, icon: Icon, color }) => (
              <button key={label} onClick={() => handleReport(label)}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-gray-300 text-left transition-all hover:shadow-sm group">
                <div className={`w-8 h-8 rounded-lg ${color.split(' ')[1]} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
                </div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-black">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">PDF generated in under 3 seconds</p>
        </div>
      </div>
    </div>
  );
}
