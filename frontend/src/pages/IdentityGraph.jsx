import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getIdentityGraph } from '../api';
import { Search, Loader2, Info } from 'lucide-react';

export default function IdentityGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fgRef = useRef();

  useEffect(() => {
    getIdentityGraph()
      .then(res => { 
        setGraphData(res.data); 
        setLoading(false); 
      })
      .catch(e => { 
        setError('Backend processing error or not connected'); 
        setLoading(false); 
      });
  }, []);

  const handleNodeClick = (node) => {
    setSelected(node);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-50/50 p-6 rounded-3xl overflow-hidden border border-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Identity Graph</h1>
          <p className="text-gray-500 text-sm">Visualizing the clinical patient network and master identity hubs</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input 
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all" 
            placeholder="Search patient node..."
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full flex-col gap-3">
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel={(node) => `${node.label} (${node.id})`}
              nodeColor={(node) => {
                if (node.type === 'golden') return '#3B82F6'; // Master Hub
                return node.color || '#CBD5E1'; // Source Nodes
              }}
              nodeRelSize={6}
              linkWidth={(link) => (link.confidence || 0.5) * 4}
              linkColor={() => '#E2E8F0'}
              linkDirectionalParticles={1}
              linkDirectionalParticleSpeed={0.01}
              onNodeClick={handleNodeClick}
              backgroundColor="#ffffff"
            />
          )}
        </div>

        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Network Legend</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20" />
                <div>
                  <p className="text-xs font-bold text-gray-800">Master Identity Hub</p>
                  <p className="text-[10px] text-gray-500">The "Golden Record" node</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-300" />
                <div>
                  <p className="text-xs font-bold text-gray-800">Source Asset Node</p>
                  <p className="text-[10px] text-gray-500">Individual record from Hospital/Lab/Ins</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-50 mt-2">
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>Edge Width</span>
                  <span className="font-medium text-gray-600">Match Confidence</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full flex-col gap-2 text-center">
                <Info className="w-8 h-8 text-gray-100" />
                <p className="text-xs text-gray-400">Click any node to view clinical details and connections</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                   <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${selected.type==='golden' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {selected.type || 'Source'}
                   </div>
                   <span className="text-[10px] font-mono text-gray-300">#{selected.id}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">{selected.label}</h3>
                
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Source Context</p>
                    <p className="text-xs font-bold text-gray-700">{selected.source || 'Unified Identity'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-black mb-1">DOB</p>
                      <p className="text-xs font-bold text-gray-700">{selected.dob || '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Quality</p>
                      <p className="text-xs font-bold text-emerald-600">{selected.data_quality || '94'}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
