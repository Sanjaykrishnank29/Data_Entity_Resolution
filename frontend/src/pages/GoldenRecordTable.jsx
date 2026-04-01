import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, ChevronRight, Crown, X, FileText, AlertTriangle, Printer } from 'lucide-react';
import { getGoldenRecords, getGoldenRecordBreakdown } from '../api';

export default function GoldenRecordTable() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dob, setDob] = useState('');
  const [insurance, setInsurance] = useState('');
  
  const [selectedId, setSelectedId] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [sources, setSources] = useState([]);
  const breakdownRef = useRef(null);

  const PAGE_SIZE = 25;

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await getGoldenRecords({
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        name: search || undefined,
        dob: dob || undefined,
        insurance_id: insurance || undefined
      });
      setRecords(res.data.records || []);
      setTotal(res.data.total || 0);
      setSources(res.data.sources || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, [page]);

  const handleRowClick = async (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setBreakdown(null);
      return;
    }
    setSelectedId(id);
    setLoadingBreakdown(true);
    try {
      const res = await getGoldenRecordBreakdown(id);
      setBreakdown(res.data);
      setTimeout(() => {
        breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) {
      console.error(e);
    }
    setLoadingBreakdown(false);
  };

  const getQualityBadge = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 70) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="page-header text-3xl font-black">Unified Golden Records</h1>
          <p className="page-subtitle text-gray-500 italic">The single version of truth across all systems</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest text-[9px]">Search Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="e.g. Maria Garcia" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="w-40">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest text-[9px]">Date of Birth</label>
          <input className="input-field" placeholder="YYYY-MM-DD" value={dob} onChange={e => setDob(e.target.value)} />
        </div>
        <div className="w-48">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest text-[9px]">Insurance ID</label>
          <input className="input-field" placeholder="Search ID..." value={insurance} onChange={e => setInsurance(e.target.value)} />
        </div>
        <button onClick={() => { setPage(1); loadRecords(); }} className="btn-primary h-10 px-6 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Apply Filter
        </button>
      </div>

      {/* Table 1 — Unified Records Table (Matches Image Requirements) */}
      <div className="card overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800 text-white">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider w-12">No</th>
                {sources.map(src => (
                   <th key={src} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-blue-300">
                     {src.charAt(0).toUpperCase() + src.slice(1)}
                   </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-emerald-300">Chosen Golden Record</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Confidence</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="8" className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : records.map((r, i) => (
                <tr key={r.patient_id} 
                  onClick={() => handleRowClick(r.patient_id)}
                  className={`group cursor-pointer hover:bg-primary-50/20 transition-colors ${selectedId === r.patient_id ? 'bg-primary-50' : ''}`}>
                  <td className="px-4 py-4 text-sm text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  {sources.map(src => (
                    <td key={src} className="px-4 py-4 text-xs text-gray-500 font-medium italic border-r border-gray-100/10">
                      {r.source_details?.[src] || '—'}
                    </td>
                  ))}
                  <td className="px-4 py-4 bg-emerald-500/5">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{r.full_name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{r.insurance_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-600">{r.sources_count}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getQualityBadge(r.overall_confidence > 1 ? r.overall_confidence : r.overall_confidence * 100)}`}>
                      {r.overall_confidence > 1 ? Math.round(r.overall_confidence) : Math.round(r.overall_confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold text-[10px] uppercase tracking-tighter transition-all">
                      AI Logic <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest">
          <p>Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} patients</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline py-1 px-3 disabled:opacity-30">Prev</button>
            <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} className="btn-outline py-1 px-3 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>

      {/* Table 2 — Source Comparison Matrix (Matches User Paper Precisely) */}
      {(loadingBreakdown || (breakdown && breakdown.rows)) && (
        <div ref={breakdownRef} className="animate-slide-down pt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Result Comparison Matrix</h2>
              <p className="text-sm text-gray-500">Audit trail showing exactly how the Golden Record was resolved field-by-field</p>
            </div>
            <div className="flex gap-3">
              <button className="btn-success flex items-center gap-2" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print Report
              </button>
              <button className="p-2 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200" onClick={() => { setSelectedId(null); setBreakdown(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="card p-0 overflow-hidden border-2 border-gray-900 shadow-2xl">
            {loadingBreakdown ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Computing Lineage...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-900 text-white text-[11px] font-black uppercase tracking-widest">
                      <th className="px-6 py-5 border-r border-gray-800 sticky left-0 bg-gray-900 z-20">Field Attribute</th>
                      <th className="px-4 py-5 border-r border-gray-800 text-center bg-blue-900/40">Source A<br/><span className="text-[8px] opacity-70">Hospital CRM</span></th>
                      <th className="px-4 py-5 border-r border-gray-800 text-center bg-emerald-900/40">Source B<br/><span className="text-[8px] opacity-70">Insurance Port</span></th>
                      <th className="px-4 py-5 border-r border-gray-800 text-center bg-amber-900/40">Source C<br/><span className="text-[8px] opacity-70">Lab Systems</span></th>
                      <th className="px-6 py-5 border-r border-gray-800 text-center bg-primary">Resolved (Golden Record)</th>
                      <th className="px-4 py-5 text-center">Conf %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-100">
                    {breakdown.rows.map((row, idx) => {
                      const isAllergy = row.field.toLowerCase().includes('allergy');
                      const isConflict = row.source_a_val !== row.source_b_val || row.source_b_val !== row.source_c_val;
                      
                      return (
                        <tr key={idx} className={`${isAllergy ? 'bg-red-50/30' : ''} ${isConflict ? 'bg-amber-50/20' : ''}`}>
                          <td className="px-6 py-4 text-xs font-black text-gray-600 bg-gray-50 border-r border-gray-200 sticky left-0 z-10 uppercase">
                            {isAllergy && <AlertTriangle className="w-3 h-3 inline mr-1 -mt-1 text-red-500" />}
                            {isConflict && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1 -mt-0.5" title="Source Conflict" />}
                            {row.field}
                          </td>
                          <td className={`px-4 py-4 text-xs text-center border-r border-gray-100 ${row.source_a_val !== row.golden_val && row.source_a_val ? 'text-red-500 line-through opacity-50' : 'text-gray-900 font-medium'}`}>
                            {row.source_a_val || '—'}
                          </td>
                          <td className={`px-4 py-4 text-xs text-center border-r border-gray-100 ${row.source_b_val !== row.golden_val && row.source_b_val ? 'text-red-500 line-through opacity-50' : 'text-gray-900 font-medium'}`}>
                            {row.source_b_val || '—'}
                          </td>
                          <td className={`px-4 py-4 text-xs text-center border-r border-gray-100 ${row.source_c_val !== row.golden_val && row.source_c_val ? 'text-red-500 line-through opacity-50' : 'text-gray-900 font-medium'}`}>
                            {row.source_c_val || '—'}
                          </td>
                          <td className="px-6 py-4 bg-primary text-white font-black text-center text-sm shadow-xl relative">
                            {row.golden_val || '—'}
                            {row.winner_source === 'Hospital CRM' && <Crown className="w-3 h-3 text-amber-500 absolute top-1 right-1 opacity-50" />}
                          </td>
                          <td className="px-4 py-4 text-center border-l bg-gray-50">
                            <span className={`text-[11px] font-black ${row.confidence >= 90 ? 'text-green-600' : row.confidence >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                              {Math.round(row.confidence)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-4">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 border border-gray-200 px-3 py-1 rounded-full">
               <span className="w-2 h-2 rounded-full bg-red-500" /> Conflict Detected
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 border border-gray-200 px-3 py-1 rounded-full">
               <span className="w-2 h-2 rounded-full bg-green-500" /> Consensus Reached
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
