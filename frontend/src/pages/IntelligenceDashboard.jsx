import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, BarChart2, Zap, Activity, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { getAnomalies, getDuplicateIQ, getSourceHealth, getEntityRelationships, getQualitySLA } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function StatCard({ icon, label, value, sub, color = 'text-cyan-400', bg = 'border-slate-800' }) {
  return (
    <div className={`bg-slate-900/60 border ${bg} rounded-2xl p-5`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-800 rounded-xl">{icon}</div>
        <div>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
          <p className="text-sm font-medium text-white">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ level }) {
  const map = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/40',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    LOW: 'bg-slate-700 text-slate-400 border-slate-600',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${map[level] || map.LOW}`}>{level}</span>;
}

export default function IntelligenceDashboard() {
  const [anomalies, setAnomalies] = useState([]);
  const [dupIQ, setDupIQ] = useState([]);
  const [sourceHealth, setSourceHealth] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [sla, setSLA] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [anom, iq, health, rels, slaData] = await Promise.allSettled([
        getAnomalies(), getDuplicateIQ(), getSourceHealth(), getEntityRelationships(), getQualitySLA()
      ]);
      if (anom.status === 'fulfilled') setAnomalies(anom.value.data.anomalies || []);
      if (iq.status === 'fulfilled') setDupIQ(iq.value.data.duplicate_iq || []);
      if (health.status === 'fulfilled') setSourceHealth(health.value.data.source_health || []);
      if (rels.status === 'fulfilled') setRelationships(rels.value.data.relationships || []);
      if (slaData.status === 'fulfilled') setSLA(slaData.value.data);
    } catch {}
    setLoading(false);
  };

  const topDupSource = dupIQ[0];
  const highAnomalies = anomalies.filter(a => a.severity === 'HIGH').length;

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-6 h-6 text-cyan-400" /> Intelligence Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Anomaly detection, source health, duplicate IQ, entity relationships</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* SLA Alert */}
      {sla?.sla_breached && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 font-semibold">{sla.alert}</p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="High Anomalies" value={highAnomalies}
          color="text-red-400" sub={`${anomalies.length} total detected`} />
        <StatCard icon={<Zap className="w-5 h-5 text-amber-400" />} label="Top Dup Source" 
          value={topDupSource?.duplicate_pct ? `${topDupSource.duplicate_pct}%` : 'N/A'}
          color="text-amber-400" sub={topDupSource?.source?.split('_').slice(0,2).join(' ')} />
        <StatCard icon={<Activity className="w-5 h-5 text-cyan-400" />} label="Data Quality SLA"
          value={sla ? `${sla.current_quality_score}%` : 'N/A'}
          color={sla?.sla_breached ? 'text-red-400' : 'text-emerald-400'}
          sub={sla?.sla_breached ? 'Below SLA threshold' : 'Meeting SLA'} />
        <StatCard icon={<Users className="w-5 h-5 text-purple-400" />} label="Hidden Relationships"
          value={relationships.length} color="text-purple-400" sub="Entity connections found" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anomaly Detection */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Anomaly Detection
          </h2>
          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No anomalies detected</div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 
                    ${a.severity === 'HIGH' ? 'bg-red-500' : a.severity === 'MEDIUM' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm text-white">{a.description}</p>
                      <SeverityBadge level={a.severity} />
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{a.type.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono shrink-0">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entity Relationships */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Entity Relationship Discovery
          </h2>
          {relationships.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No hidden relationships found</div>
          ) : (
            <div className="space-y-3">
              {relationships.slice(0, 6).map((r, i) => (
                <div key={i} className="p-3 bg-slate-800/40 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge level={r.severity} />
                    <span className="text-xs text-slate-400 capitalize">{r.type.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-white mb-1">{r.description}</p>
                  <p className="text-xs text-cyan-400">{r.possible_relation}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {r.names?.slice(0, 3).map((n, j) => (
                      <span key={j} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Duplicate IQ Score */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" /> Duplicate Entry IQ Score
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Score each source system by duplicate contribution percentage — higher IQ score means fewer duplicates (better quality)
        </p>
        {dupIQ.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">Run pipeline to see source IQ scores</div>
        ) : (
          <div className="space-y-3">
            {dupIQ.map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-slate-800/40 rounded-xl">
                <div className="w-40 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{s.source}</p>
                  <p className="text-xs text-slate-400">{s.total_records} records</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Duplicate Rate</span>
                    <span className="text-xs font-bold text-white">{s.duplicate_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${s.duplicate_pct > 20 ? 'bg-red-500' : s.duplicate_pct > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(s.duplicate_pct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right min-w-16">
                  <p className={`text-lg font-black ${s.iq_score > 80 ? 'text-emerald-400' : s.iq_score > 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {s.iq_score}
                  </p>
                  <p className="text-xs text-slate-500">IQ Score</p>
                </div>
                <SeverityBadge level={s.risk_level} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source Health Report */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-cyan-400" /> Source Health Report
        </h2>
        <p className="text-xs text-slate-400 mb-5">Per-source: completeness rate, conflict rate, duplicate contribution</p>
        {sourceHealth.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">Run pipeline to see source health</div>
        ) : (
          <>
            <div className="h-56 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceHealth} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                  <XAxis dataKey="source" tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={v => v.split('_').slice(0,2).join(' ')} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e2530', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="completeness_rate" name="Completeness %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="duplicate_contribution" name="Duplicate %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {sourceHealth.map((s, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <p className="w-36 text-slate-300 truncate">{s.source}</p>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Completeness</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                      <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${s.completeness_rate}%` }} />
                    </div>
                    <span className="text-xs font-bold text-cyan-400 w-10 text-right">{s.completeness_rate}%</span>
                  </div>
                  <div className="flex items-center gap-2 w-36">
                    <span className="text-xs text-slate-500">Dup%</span>
                    <span className={`text-xs font-bold ${s.duplicate_contribution > 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {s.duplicate_contribution}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
