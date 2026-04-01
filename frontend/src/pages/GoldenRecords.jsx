import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield } from 'lucide-react';
import { getGoldenRecords, getGoldenRecord } from '../api';
import GoldenRecordViewer from '../components/GoldenRecordViewer';

export default function GoldenRecords() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dob, setDob] = useState('');
  const [insurance, setInsurance] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedFull, setSelectedFull] = useState(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 40;

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const res = await getGoldenRecords({ 
        name: search || undefined, 
        dob: dob || undefined, 
        insurance_id: insurance || undefined,
        limit: PAGE_SIZE,
        skip: (currentPage - 1) * PAGE_SIZE
      });
      
      const newRecords = res.data.records || [];
      if (reset) {
        setRecords(newRecords);
        setPage(2);
      } else {
        setRecords(prev => [...prev, ...newRecords]);
        setPage(prev => prev + 1);
      }
      setTotal(res.data.total || 0);
    } catch {
      if (reset) setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(true); }, []);

  const handleSearch = () => {
    load(true);
  };

  const handleCardClick = async (rec) => {
    setSelected(rec);
    try {
      const full = await getGoldenRecord(rec.patient_id);
      setSelectedFull(full.data);
    } catch {
      setSelectedFull(rec);
    }
  };

  const qualityBadge = (score) => {
    if (score >= 85) return 'badge-success';
    if (score >= 70) return 'badge-warning';
    return 'badge-danger';
  };

  return (
    <div>
      <h1 className="page-header">Patient Records</h1>
      <p className="page-subtitle">All golden records — unified, resolved patient identities</p>

      {/* Search bar */}
      <div className="card p-4 mb-5 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search by name..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
        </div>
        <input className="input-field w-40" placeholder="DOB (YYYY-MM-DD)"
          value={dob} onChange={e => setDob(e.target.value)} />
        <input className="input-field w-44" placeholder="Insurance ID"
          value={insurance} onChange={e => setInsurance(e.target.value)} />
        <button onClick={handleSearch} className="btn-primary flex items-center gap-2">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest text-[9px]">{total} Identities Resolved</p>
        <span className="badge badge-primary">{records.length} patients in view</span>
      </div>

      {records.length === 0 && !loading ? (
        <div className="card py-20 text-center">
           <p className="text-gray-400 text-sm font-black uppercase tracking-widest">No Master Records Found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {records.map(rec => (
              <div key={rec.patient_id} onClick={() => handleCardClick(rec)}
                className="card p-4 cursor-pointer hover:border-black hover:shadow-2xl transition-all duration-200 border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-900 font-black text-sm shrink-0">
                    {rec.first_name?.[0]}{rec.last_name?.[0]}
                  </div>
                  <span className={`badge ${qualityBadge(rec.data_quality_score)} text-[10px] font-black`}>
                    {Math.round(rec.data_quality_score)}% Accuracy
                  </span>
                </div>
                <h3 className="font-black text-gray-900 text-sm mb-0.5 uppercase tracking-tighter">{rec.full_name || 'Unknown Patient'}</h3>
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">DOB: {rec.dob}</p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-gray-500 truncate">IID: {rec.insurance_id || '—'}</p>
                  {rec.allergy && (
                    <p className="text-[10px] text-red-600 font-black truncate uppercase" title={rec.allergy}>
                      ⚠️ Merged Allergies
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {rec.sources_count} Cloud Source{rec.sources_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {rec.last_updated ? new Date(rec.last_updated).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-4 py-8">
            {records.length < total ? (
              <button 
                onClick={() => load()} 
                disabled={loading}
                className="btn-outline px-10 py-3 font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all"
              >
                {loading ? 'Consulting Master Index...' : 'Load More Entities'}
              </button>
            ) : (
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">All resolved identities verified</p>
            )}
          </div>
        </>
      )}

      {selectedFull && <GoldenRecordViewer record={selectedFull} onClose={() => { setSelected(null); setSelectedFull(null); }} />}
    </div>
  );
}
