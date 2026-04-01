import React, { useState } from 'react';
import { Terminal, Play, Download, Copy, ChevronRight, Brain, Database, Table2, Sparkles } from 'lucide-react';
import { runQuery } from '../api';
import GoldenRecordViewer from '../components/GoldenRecordViewer';

const SUGGESTED_PROMPTS = [
  'Show all entities with high duplicate confidence',
  'Find records where email field is missing',
  'List all unresolved conflicts in the queue',
  'Show master entities merged from 3+ sources',
  'Find entities with attribute collisions',
];

const SUGGESTED_SQL = [
  'SELECT * FROM golden_records LIMIT 20',
  'SELECT full_name, sources_count, data_quality_score FROM golden_records ORDER BY sources_count DESC',
  'SELECT * FROM candidate_pairs WHERE confidence > 0.8 AND status = \'pending\'',
  'SELECT source, COUNT(*) as total FROM source_records GROUP BY source',
];

export default function QueryConsole() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('plain_english');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const execute = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await runQuery({ query: q, mode });
      setResults(res.data);
    } catch (e) {
      setResults({ error: e.message, results: [] });
    }
    setLoading(false);
  };

  const exportCSV = () => {
    if (!results?.results?.length) return;
    const keys = Object.keys(results.results[0]);
    const rows = [keys.join(','), ...results.results.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'infynd_results.csv'; a.click();
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(results?.results, null, 2));
  };

  const modes = [
    { id: 'plain_english', icon: Brain, label: 'AI Prompt', placeholder: 'Ask anything... e.g. "Show entities with duplicate phone numbers"' },
    { id: 'sql', icon: Terminal, label: 'SQL', placeholder: 'SELECT * FROM master_entities WHERE confidence > 0.9' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">AI Query Console</h1>
        <p className="text-sm text-gray-400 mt-1 font-medium">
          Query your entire dataset using <strong className="text-primary">plain English</strong>, <strong className="text-gray-700">SQL</strong>, or <strong className="text-gray-700">browse the table directly</strong> — no code required.
        </p>
      </div>

      {/* Mode Tabs & Input */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-4">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-4">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === m.id
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-primary" />
            Infynd AI
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {mode === 'sql'
                ? <Terminal className="w-4 h-4 text-gray-400" />
                : <Brain className="w-4 h-4 text-primary" />
              }
            </div>
            <input
              className="w-full h-12 pl-10 pr-4 border-2 border-gray-100 focus:border-black rounded-xl outline-none font-mono text-sm bg-gray-50 transition-all"
              placeholder={modes.find(m => m.id === mode)?.placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && execute()}
            />
          </div>
          <button
            onClick={() => execute()}
            disabled={loading}
            className="h-12 px-6 bg-black text-white font-bold rounded-xl flex items-center gap-2 hover:bg-primary transition-all disabled:opacity-50"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Play className="w-4 h-4" />
            }
            Run
          </button>
        </div>

        {/* Suggested Chips */}
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
            {mode === 'sql' ? 'Sample SQL Queries' : 'Try These Prompts'}
          </p>
          <div className="flex flex-wrap gap-2">
            {(mode === 'sql' ? SUGGESTED_SQL : SUGGESTED_PROMPTS).map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); execute(s); }}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-primary-50 hover:text-primary border border-gray-200 hover:border-primary-200 rounded-full transition-colors font-mono"
              >
                {s.length > 50 ? s.slice(0, 50) + '...' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Panel */}
      {results && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-black text-gray-900">Results</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary border border-primary-100">
                {results.count ?? results.results?.length ?? 0} entities
              </span>
              {results.ai_interpreted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                  <Sparkles className="w-3 h-3" /> AI Interpreted
                </span>
              )}
              {results.error && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700">Error</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={copyJSON} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Copy className="w-3 h-3" /> JSON
              </button>
            </div>
          </div>

          {results.ai_answer && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900 leading-relaxed font-medium">
                {results.ai_answer}
              </div>
            </div>
          )}

          {results.error && <p className="text-red-600 text-sm font-mono bg-red-50 p-3 rounded-lg">{results.error}</p>}

          {results.results?.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {Object.keys(results.results[0]).slice(0, 8).map(k => (
                      <th key={k} className="text-left py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {k.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => setSelected(row)}
                    >
                      {Object.values(row).slice(0, 8).map((val, j) => (
                        <td key={j} className="py-3 px-4 text-gray-700 truncate max-w-xs font-medium" title={String(val)}>
                          {val !== null && val !== undefined ? String(val).slice(0, 40) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="py-3 px-2">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results.results?.length === 0 && !results.error && (
            <div className="text-center py-16">
              <Table2 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-bold">No matching entities found</p>
              <p className="text-gray-300 text-xs mt-1">Try adjusting your query or prompt</p>
            </div>
          )}
        </div>
      )}

      {selected && <GoldenRecordViewer record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
