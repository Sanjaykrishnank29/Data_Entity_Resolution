import React, { useState } from 'react';
import {
  Layers, ShieldCheck, Zap, GitMerge,
  ChevronRight, ArrowRight, Database, Brain, Filter, Table2, Terminal
} from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      {/* --- Sticky Header --- */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">INFYND</span>
            <span className="ml-2 text-[10px] font-black text-primary bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Data DNA</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold hover:text-primary transition-colors">Features</a>
            <a href="#workflow" className="text-sm font-bold hover:text-primary transition-colors">How It Works</a>
            <a href="#login" className="bg-black text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-primary transition-all">
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Universal Data Intelligence Engine</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter">
            YOUR DATA.<br />
            <span className="text-primary italic">ZERO CODE.</span><br />
            TOTAL CONTROL.
          </h1>

          <p className="text-xl text-gray-500 max-w-lg leading-relaxed font-medium">
            Infynd Data DNA lets you import <strong className="text-gray-900">any database</strong>, resolve duplicate entities, and query your entire dataset — using plain English prompts, SQL, or a direct visual table browser. No engineering required.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a href="#login" className="bg-primary text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
              Start Resolving <ChevronRight className="w-5 h-5" />
            </a>
            <a href="#workflow" className="bg-black text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-gray-800 transition-all">
              See the Workflow
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-10 border-t border-gray-100">
            {[
              { value: '3 Modes', label: 'Query Access' },
              { value: '<1s', label: 'Ingestion Speed' },
              { value: 'Any DB', label: 'Source Compatible' },
              { value: 'GDPR', label: 'Governance Ready' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-black italic">{value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* --- Login Form --- */}
        <div id="login" className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-black/10 to-primary/25 rounded-[40px] blur-2xl opacity-60 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white border-4 border-black p-10 rounded-[32px] shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight">Access Your Workspace</h2>
              <p className="text-gray-400 text-sm mt-1 font-medium">Connect your data. Ask anything. Resolve everything.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none font-bold text-sm transition-all"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none font-bold text-sm transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-black text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>ENTER WORKSPACE <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>

            <p className="text-center text-[10px] font-bold text-gray-400 mt-6">
              DEMO MODE — use any credentials to sign in
            </p>
          </div>
        </div>
      </section>

      {/* --- 3 Access Modes Section --- */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-12">Three Ways To Access Your Data — No Engineering Required</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                mode: '01. Prompt',
                title: 'Ask in Plain English',
                example: '"Show me all duplicate customers from California with high confidence"',
                color: 'border-primary',
                badge: 'bg-primary-50 text-primary',
              },
              {
                icon: Terminal,
                mode: '02. SQL',
                title: 'Write SQL Queries',
                example: 'SELECT * FROM master_entities WHERE confidence > 0.9 LIMIT 20',
                color: 'border-black',
                badge: 'bg-gray-100 text-gray-800',
              },
              {
                icon: Table2,
                mode: '03. Browse',
                title: 'Visual Table Browser',
                example: 'Scroll, filter and inspect every master entity row — no query needed.',
                color: 'border-gray-200',
                badge: 'bg-gray-50 text-gray-600',
              },
            ].map((m) => (
              <div key={m.mode} className={`bg-white p-8 rounded-3xl border-2 ${m.color} shadow-sm`}>
                <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 ${m.badge}`}>
                  {m.mode}
                </div>
                <m.icon className="w-8 h-8 mb-4 text-gray-700" />
                <h3 className="text-xl font-black mb-3">{m.title}</h3>
                <p className="font-mono text-sm text-gray-500 bg-gray-50 border border-gray-100 p-3 rounded-xl leading-relaxed">
                  {m.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Features --- */}
      <section id="features" className="py-32 bg-black text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">What Infynd Solves</h2>
            <p className="text-gray-400 mt-4 max-w-xl text-lg font-medium">
              Upload CSVs, Excel files, or connect a live database — Infynd automatically resolves duplicates, builds master entity records, and makes the data instantly queryable.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Database, title: 'Any Dataset', desc: 'Customers, Products, Leads, Patients, Inventory — Infynd auto-maps schemas from any source.' },
              { icon: Filter, title: 'Schema Auto-Mapping', desc: 'Column name variations ("Full Name", "Name", "customer_name") are all automatically unified.' },
              { icon: GitMerge, title: 'Entity Resolution', desc: 'Duplicate detection using Jaro-Winkler, Metaphone, LSH, and Sorted Neighbourhood blocking.' },
              { icon: Brain, title: 'AI Conflict Resolution', desc: 'When two records disagree, the AI reasoning bureau picks the best value using authority, recency and completeness rules.' },
              { icon: ShieldCheck, title: 'Data Governance', desc: 'GDPR erasure, field-level masking, HIPAA/SOC2 checklists, and a full tamper-proof audit log.' },
              { icon: Zap, title: 'Real-Time Ingestion', desc: 'Drop a file in the watched folder and the pipeline triggers instantly — no manual imports.' },
            ].map((f, i) => (
              <div key={i} className="group p-8 border border-white/10 rounded-3xl hover:border-primary/50 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black mb-3 uppercase italic">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-semibold">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Workflow --- */}
      <section id="workflow" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase underline decoration-primary decoration-8 underline-offset-8">THE INFYND FLOW</h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-[60px] left-0 right-0 h-1 bg-gray-100"></div>
            <div className="grid lg:grid-cols-4 gap-12 relative z-10">
              {[
                { step: '01', name: 'IMPORT', desc: 'Upload any CSV or connect any DB source. Auto schema detection activates.' },
                { step: '02', name: 'RESOLVE', desc: 'Duplicate entities are detected and merged into a single Master Record.' },
                { step: '03', name: 'QUERY', desc: 'Ask in plain English, write SQL, or browse the table — your data instantly queryable.' },
                { step: '04', name: 'TRUST', desc: 'One clean, verified Master Entity per record — free from duplication forever.' },
              ].map((w) => (
                <div key={w.step} className="space-y-6 text-center lg:text-left">
                  <div className="w-16 h-16 bg-white border-4 border-black rounded-2xl flex items-center justify-center font-black text-2xl mx-auto lg:mx-0 shadow-lg">
                    {w.step}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic">{w.name}</h3>
                    <p className="text-gray-500 text-sm font-semibold max-w-[200px] mx-auto lg:mx-0 mt-2">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-16 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">INFYND</span>
            <span className="text-primary font-black text-sm italic ml-1">Data DNA</span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] text-center">
            © 2026 INFYND TECHNOLOGIES · UNIVERSAL ENTITY INTELLIGENCE PLATFORM
          </p>
        </div>
      </footer>
    </div>
  );
}
