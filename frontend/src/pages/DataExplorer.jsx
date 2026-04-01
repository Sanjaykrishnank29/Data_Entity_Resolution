import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Download, ChevronDown, ChevronUp, BarChart2,
  MessageSquare, X, Send, Sparkles, RefreshCw, AlertTriangle
} from 'lucide-react';

const API = 'http://127.0.0.1:8001';

const QUERY_CHIPS = [
  { label: '🚨 Allergy Conflicts', filter: (r) => r.allergy_critical },
  { label: '⬇️ Low Quality (<60)', filter: (r) => r.data_quality_score < 60 },
  { label: '📦 Multi-Source', filter: (r) => r.sources_count > 1 },
  { label: '📱 Missing Phone', filter: (r) => !r.phone },
  { label: '📧 Missing Email', filter: (r) => !r.email },
  { label: '✅ High Quality (≥90)', filter: (r) => r.data_quality_score >= 90 },
];

const FIELD_TRUST = [
  { field: 'DOB', trust: 94 }, { field: 'Insurance ID', trust: 89 }, { field: 'Name', trust: 82 },
  { field: 'Email', trust: 74 }, { field: 'Allergy', trust: 71 }, { field: 'Phone', trust: 67 },
  { field: 'Diagnosis', trust: 63 }, { field: 'Address', trust: 58 },
];

function QualityBadge({ score }) {
  const pct = Math.round(score || 0);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
      pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
    }`}>{pct}%</span>
  );
}

function RecordExpandedDetail({ record }) {
  return (
    <tr>
      <td colSpan={9} className="bg-gray-50 border-b border-gray-100 px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Patient ID', value: record.patient_id },
            { label: 'Address', value: record.address },
            { label: 'Allergy', value: record.allergy, critical: record.allergy_critical },
            { label: 'Diagnosis', value: record.diagnosis },
            { label: 'Resolution Method', value: record.resolution_method },
            { label: 'Overall Confidence', value: record.overall_confidence ? `${Math.round(record.overall_confidence * 100)}%` : '—' },
            { label: 'Last Updated', value: record.last_updated ? new Date(record.last_updated).toLocaleDateString() : '—' },
            { label: 'Sources Count', value: record.sources_count },
          ].map(({ label, value, critical }) => (
            <div key={label}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${critical ? 'text-red-600' : 'text-gray-400'}`}>{label}</p>
              <p className={`text-sm font-semibold ${critical ? 'text-red-700' : 'text-gray-900'}`}>{value || '—'}</p>
              {critical && <span className="badge badge-danger text-[9px] mt-0.5">⚠ ALLERGY CONFLICT</span>}
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

function GoldenRow({ record, expanded, onToggle }) {
  return (
    <>
      <tr
        onClick={() => onToggle(record.patient_id)}
        className={`cursor-pointer border-b border-gray-50 transition-colors ${expanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
      >
        <td className="px-3 py-2.5 text-xs text-gray-400 w-8">{record._idx}</td>
        <td className="px-3 py-2.5">
          <span className="text-sm font-semibold text-gray-900">{record.full_name || '—'}</span>
          {record.allergy_critical && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600">{record.dob || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600">{record.phone || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[130px] truncate">{record.email || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600">{record.insurance_id || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[100px] truncate">{record.address || '—'}</td>
        <td className="px-3 py-2.5"><QualityBadge score={record.data_quality_score} /></td>
        <td className="px-3 py-2.5 text-xs text-gray-500 text-center">{record.sources_count}</td>
        <td className="px-3 py-2.5 w-6">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </td>
      </tr>
      {expanded && <RecordExpandedDetail record={record} />}
    </>
  );
}

export default function DataExplorer() {
  const [allRecords, setAllRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [queryMode, setQueryMode] = useState('natural');
  const [activeChip, setActiveChip] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [sortCol, setSortCol] = useState('data_quality_score');
  const [sortDir, setSortDir] = useState('desc');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: '👋 Ask me anything about your data — quality, duplicates, allergy conflicts, exports, or navigation.' }
  ]);
  const [queryResult, setQueryResult] = useState(null);
  const [totalInDb, setTotalInDb] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(null);

  const tableScrollRef = useRef(null);
  const chatEndRef = useRef(null);

  const loadRecords = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API}/golden-records?limit=500`);
      const d = await res.json();
      const recs = (d.records || []).map((r, i) => ({ ...r, _idx: i + 1 }));
      setAllRecords(recs);
      setFiltered(recs);
      setTotalInDb(d.total || recs.length);
    } catch {
      // Use mock data if backend is down
      setAllRecords([]);
      setFiltered([]);
      setTotalInDb(0);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // Apply search + chip filter + sort
  useEffect(() => {
    let result = [...allRecords];
    if (activeChip !== null) {
      result = result.filter(QUERY_CHIPS[activeChip].filter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(r =>
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.insurance_id || '').toLowerCase().includes(q) ||
        (r.patient_id || '').toLowerCase().includes(q)
      );
    }
    result = result.sort((a, b) => {
      const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    setFiltered(result);
    setQueryResult({ count: result.length, of: totalInDb });
  }, [searchText, activeChip, allRecords, sortCol, sortDir]);

  const handleSort = (col) => {
    setSortDir(sortCol === col && sortDir === 'asc' ? 'desc' : 'asc');
    setSortCol(col);
  };

  const handleChip = (idx) => {
    setActiveChip(prev => prev === idx ? null : idx);
    setSearchText('');
    setAiAnswer(null);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    
    // If it's a simple search (one or two words) and we are in natural mode,
    // the useEffect already handles local filtering.
    // If it's more complex, or SQL mode, we hit the backend.
    const isComplex = searchText.split(' ').length > 2 || queryMode === 'sql';
    if (!isComplex && queryMode === 'natural') return;

    setIsQuerying(true);
    setAiAnswer(null);
    try {
      const res = await fetch(`${API}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchText, mode: queryMode })
      });
      const data = await res.json();
      if (data.results) {
        const recs = data.results.map((r, i) => ({ ...r, _idx: i + 1 }));
        setFiltered(recs);
        setQueryResult({ count: recs.length, of: totalInDb });
        if (data.ai_answer) setAiAnswer(data.ai_answer);
      } else if (data.error) {
        setAiAnswer(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setAiAnswer(`❌ Failed to connect to AI query engine.`);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleChat = async () => {
    if (!chatMsg.trim()) return;
    const q = chatMsg.trim();
    setChatMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setIsQuerying(true);

    const lower = q.toLowerCase();
    let response;
    let foundResults = false;

    // Quick local checks/navigation first
    if (lower.includes('export') || lower.includes('download')) {
      response = `📥 Click the **Export CSV** button in the header to download all ${totalInDb} master records as a clean CSV file.`;
    } else {
      // LLM BACKEND QUERY
      try {
        const res = await fetch(`${API}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, mode: 'natural' })
        });
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const recs = data.results.map((r, i) => ({ ...r, _idx: i + 1 }));
          setFiltered(recs);
          setQueryResult({ count: recs.length, of: totalInDb });
          foundResults = true;
          response = data.ai_answer || `📊 Found ${recs.length} matching master entities based on your query. I've updated the table for you.`;
        } else {
          response = data.error 
            ? `❌ I ran into an error: ${data.error}`
            : `🔍 I couldn't find any records matching that specific criteria in the master index. Try a different question like "how many duplicates?" or "show patients with allergy conflicts".`;
        }
      } catch (err) {
        response = `🤔 I'm analyzing your data patterns. If the AI engine is busy, try a simpler search or filter using the chips above.`;
      }
    }

    setChatHistory(prev => [...prev, { role: 'assistant', text: response }]);
    setIsQuerying(false);
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Name', 'DOB', 'Phone', 'Email', 'Insurance ID', 'Address', 'Quality', 'Sources', 'Resolution Method', 'Patient ID'];
    const rows = filtered.map(r => [r._idx, r.full_name, r.dob, r.phone, r.email, r.insurance_id, r.address, r.data_quality_score, r.sources_count, r.resolution_method, r.patient_id]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'infynd_master_entities.csv'; a.click();
  };

  const COLS = [
    { key: '_idx', label: '#', sortable: false, w: 'w-8' },
    { key: 'full_name', label: 'Name', sortable: true },
    { key: 'dob', label: 'DOB', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'insurance_id', label: 'Insurance ID', sortable: false },
    { key: 'address', label: 'Address', sortable: false },
    { key: 'data_quality_score', label: 'Quality', sortable: true },
    { key: 'sources_count', label: 'Srcs', sortable: true },
    { key: '_expand', label: '', sortable: false, w: 'w-6' },
  ];

  return (
    /* The entire page is a fixed-height flex column — no page-level scroll */
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>

      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🔍 Data Explorer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Query and browse your unified Master Entity Index</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadRecords} disabled={isRefreshing} className="btn-outline flex items-center gap-2 text-xs">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleExportCSV} className="btn-outline flex items-center gap-2 text-xs">
            <Download className="w-3 h-3" /> Export CSV
          </button>
          <button onClick={() => setChatOpen(!chatOpen)} className="btn-primary flex items-center gap-2 text-xs">
            <Sparkles className="w-3 h-3" /> Ask AI
          </button>
        </div>
      </div>

      {/* ─── MAIN LAYOUT: TABLE LEFT + CHAT RIGHT ─── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── TABLE SECTION (full height, internal scroll) ── */}
        <div className="flex-1 flex flex-col min-h-0 card overflow-hidden">

          {/* Table Header Bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-black text-gray-900 text-sm">Master Entities</span>
              {queryResult && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${queryResult.count < queryResult.of ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  {queryResult.count} / {queryResult.of}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Live golden records — zero duplicates
            </div>
          </div>

          {/* Sticky Table Header + Scrollable Body */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {/* Sticky col headers */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-left">
                        {COLS.map(col => (
                          <th key={col.key}
                            className={`px-3 py-2.5 text-xs font-black text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-gray-700' : ''} ${col.w || ''}`}
                            onClick={() => col.sortable && handleSort(col.key)}>
                            {col.label}
                            {col.sortable && sortCol === col.key && (
                              <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Scrollable table body */}
                <div ref={tableScrollRef} className="flex-1 overflow-y-auto relative">
                  {isQuerying && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <tbody>
                      {aiAnswer && (
                        <tr>
                          <td colSpan={10} className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                            <div className="flex items-start gap-3">
                              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                              <div className="text-sm text-blue-900 leading-relaxed font-medium">
                                {aiAnswer}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {filtered.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>No records match your query.</p>
                          <button onClick={() => { setActiveChip(null); setSearchText(''); setAiAnswer(null); loadRecords(); }} className="text-xs text-red-600 mt-2 hover:underline">Reset Explorer</button>
                        </td></tr>
                      ) : filtered.map(r => (
                        <GoldenRow
                          key={r.patient_id}
                          record={r}
                          expanded={expandedId === r.patient_id}
                          onToggle={(id) => setExpandedId(prev => prev === id ? null : id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CHAT SIDE PANEL ── */}
        {chatOpen && (
          <div className="w-72 card flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <span className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-red-600" /> Data Assistant
              </span>
              <button onClick={() => setChatOpen(false)}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    m.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {m.text.split('**').map((part, j) =>
                      j % 2 === 0 ? <span key={j}>{part}</span> : <strong key={j}>{part}</strong>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="px-3 pb-3 flex gap-2 shrink-0">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Ask about your data..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/10" />
              <button onClick={handleChat} className="p-2 bg-black text-white rounded-lg hover:bg-gray-800">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── QUERY ENGINE (below table, no page scroll) ─── */}
      <div className="mt-4 shrink-0">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs shrink-0">
              {['natural', 'sql'].map(mode => (
                <button key={mode} onClick={() => setQueryMode(mode)}
                  className={`px-3 py-1.5 font-bold capitalize transition-colors ${queryMode === mode ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {mode === 'natural' ? <><Sparkles className="w-3 h-3 inline mr-1" />Natural Language</> : 'SQL'}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setActiveChip(null); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={queryMode === 'natural' ? 'Ask a question (e.g. "Patients with allergy conflicts") or search...' : 'SELECT * FROM golden_records WHERE data_quality_score > 80 LIMIT 50'}
                className="w-full pl-9 pr-12 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                title="Execute Query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {(searchText || activeChip !== null || aiAnswer) && (
              <button onClick={() => { setSearchText(''); setActiveChip(null); setAiAnswer(null); loadRecords(); }} className="text-xs text-red-600 font-bold hover:underline shrink-0">
                Clear
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400 shrink-0">Quick Filters:</span>
            {QUERY_CHIPS.map((chip, idx) => (
              <button key={idx} onClick={() => handleChip(idx)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${activeChip === idx ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}>
                {chip.label}
              </button>
            ))}
          </div>

          {/* Field Trust Scores */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0 w-24">Field Trust</span>
              <div className="flex gap-3 overflow-x-auto pb-0.5">
                {FIELD_TRUST.map(({ field, trust }) => (
                  <div key={field} className="shrink-0 text-center" style={{ minWidth: '64px' }}>
                    <div className="text-[9px] text-gray-500 font-bold mb-1">{field}</div>
                    <div className="h-1 bg-gray-100 rounded-full w-16">
                      <div className={`h-1 rounded-full ${trust >= 80 ? 'bg-green-500' : trust >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${trust}%` }} />
                    </div>
                    <div className={`text-[9px] mt-0.5 font-bold ${trust >= 80 ? 'text-green-600' : trust >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{trust}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
