import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle, Eye, EyeOff, Trash2, Lock, FileText, RefreshCw } from 'lucide-react';
import { getComplianceStatus } from '../api';

function StatusBadge({ status }) {
  const map = {
    ready: { cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', label: 'READY' },
    partial: { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40', label: 'PARTIAL' },
    missing: { cls: 'bg-red-500/20 text-red-400 border-red-500/40', label: 'MISSING' },
  };
  const cfg = map[status] || map.missing;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
  );
}

function ChecklistPanel({ title, icon, items, ready, total }) {
  const pct = Math.round((ready / total) * 100);
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-slate-400">Readiness indicators — not legal certification</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white">{pct}%</div>
          <div className="text-xs text-slate-400">{ready}/{total} checks</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
        <div
          className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40">
            {item.status === 'ready'
              ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium text-white">{item.requirement}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-xs text-slate-400">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyFeatureCard({ icon, title, description, status }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex gap-4">
      <div className="p-3 bg-slate-800 rounded-xl h-fit">{icon}</div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function PrivacyCompliance() {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getComplianceStatus();
      setCompliance(data);
    } catch {
      setCompliance(null);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" /> Privacy & Compliance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            HIPAA & GDPR readiness indicators — live system posture
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'HIPAA Ready', value: `${compliance?.hipaa_ready_count}/${compliance?.hipaa_total}`, color: 'text-cyan-400', icon: '🏥' },
          { label: 'GDPR Ready', value: `${compliance?.gdpr_ready_count}/${compliance?.gdpr_total}`, color: 'text-purple-400', icon: '🇪🇺' },
          { label: 'PHI Masking', value: 'Active', color: 'text-emerald-400', icon: '🔒' },
          { label: 'Erasure Engine', value: 'Ready', color: 'text-emerald-400', icon: '🗑️' },
        ].map((c) => (
          <div key={c.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-300">
          <strong>Important:</strong> These are system readiness indicators only and do not constitute legal certification for HIPAA or GDPR compliance. Consult qualified legal and compliance professionals for formal certification.
        </p>
      </div>

      {/* Privacy Features */}
      <div>
        <h2 className="text-white font-bold mb-3 text-sm uppercase tracking-wide">Active Privacy Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrivacyFeatureCard
            icon={<EyeOff className="w-5 h-5 text-cyan-400" />}
            title="Field-Level PHI Masking"
            description="Phone numbers and Insurance IDs masked by default. Click to reveal with reason input. Every unmask action logged."
            status="ready"
          />
          <PrivacyFeatureCard
            icon={<FileText className="w-5 h-5 text-purple-400" />}
            title="Consent Tracking"
            description="Consent flag per source record. Warning shown if consent missing. Cannot merge without consent resolved."
            status="ready"
          />
          <PrivacyFeatureCard
            icon={<Trash2 className="w-5 h-5 text-red-400" />}
            title="Right to Erasure (Art. 17)"
            description="One-click deletion of all patient instances across all sources. Tombstone record preserves audit without retaining data."
            status="ready"
          />
          <PrivacyFeatureCard
            icon={<Lock className="w-5 h-5 text-emerald-400" />}
            title="Data Minimization"
            description="Redundant empty fields from duplicate sources not stored in golden record. Only necessary data retained."
            status="ready"
          />
          <PrivacyFeatureCard
            icon={<Eye className="w-5 h-5 text-amber-400" />}
            title="Full Audit Trail"
            description="Every action logged with timestamp, action type, records involved, and reviewer note. Queryable and exportable."
            status="ready"
          />
          <PrivacyFeatureCard
            icon={<Shield className="w-5 h-5 text-blue-400" />}
            title="Record DNA Fingerprint"
            description="SHA-256 hash of normalized DOB + Insurance + Name phonetic. Instant sub-millisecond detection for known entities."
            status="ready"
          />
        </div>
      </div>

      {/* HIPAA & GDPR checklists */}
      {compliance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChecklistPanel
            title="HIPAA Readiness"
            icon={<Shield className="w-6 h-6 text-blue-400" />}
            items={compliance.hipaa}
            ready={compliance.hipaa_ready_count}
            total={compliance.hipaa_total}
          />
          <ChecklistPanel
            title="GDPR Readiness"
            icon={<Shield className="w-6 h-6 text-purple-400" />}
            items={compliance.gdpr}
            ready={compliance.gdpr_ready_count}
            total={compliance.gdpr_total}
          />
        </div>
      )}
    </div>
  );
}
