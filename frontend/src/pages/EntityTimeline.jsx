import React, { useState, useEffect } from 'react';
import { Clock, User, GitMerge, MapPin, Database, Edit } from 'lucide-react';
import { getGoldenRecords, getEntityTimeline } from '../api';

const EVENT_ICONS = {
  name_change: User,
  merge: GitMerge,
  split: Edit,
  admission: Database,
  address_update: MapPin,
  source_added: Database,
  update: Edit,
};

const EVENT_COLORS = {
  name_change: 'bg-purple-100 text-purple-700 border-purple-200',
  merge: 'bg-blue-100 text-blue-700 border-blue-200',
  split: 'bg-orange-100 text-orange-700 border-orange-200',
  admission: 'bg-green-100 text-green-700 border-green-200',
  address_update: 'bg-teal-100 text-teal-700 border-teal-200',
  update: 'bg-gray-100 text-gray-600 border-gray-200',
  source_added: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function EntityTimeline() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nameChange, setNameChange] = useState(null);

  useEffect(() => {
    getGoldenRecords({ limit: 100 }).then(res => setPatients(res.data.records || [])).catch(() => {});
  }, []);

  const loadTimeline = async (pid) => {
    setSelectedPatient(pid);
    setLoading(true);
    setEvents([]);
    try {
      const res = await getEntityTimeline(pid);
      setEvents(res.data.events || []);
      setNameChange(res.data.name_change);
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <h1 className="page-header">Entity Timeline</h1>
      <p className="page-subtitle">Track the evolution of every patient identity over time</p>

      <div className="mb-6 flex items-center gap-4">
        <select className="input-field w-80"
          value={selectedPatient}
          onChange={e => loadTimeline(e.target.value)}>
          <option value="">Select a patient...</option>
          {patients.map(p => (
            <option key={p.patient_id} value={p.patient_id}>
              {p.full_name} ({p.patient_id})
            </option>
          ))}
        </select>
        {nameChange?.detected && (
          <div className="badge badge-warning text-sm px-3 py-1">
            📝 Name changed: {nameChange.old_name} → {nameChange.new_name}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Timeline */}
          <div className="col-span-2 card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-6">Timeline</h3>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

              {events.map((evt, i) => {
                const Icon = EVENT_ICONS[evt.event_type] || Edit;
                const color = EVENT_COLORS[evt.event_type] || EVENT_COLORS.update;
                return (
                  <div key={i} className="flex gap-4 mb-6 relative animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}>
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 z-10 cursor-pointer ${color} ${selectedEvent?.id === evt.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedEvent(evt)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pb-2 cursor-pointer" onClick={() => setSelectedEvent(evt)}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{evt.description}</p>
                        <span className="text-xs text-gray-400">
                          {evt.timestamp ? new Date(evt.timestamp).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge text-[10px] ${color}`}>{evt.event_type.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400">v{evt.version}</span>
                      </div>
                      {evt.changed_fields?.map((cf, j) => (
                        <p key={j} className="text-xs text-gray-500 mt-1">
                          {cf.field}: <span className="line-through text-red-400">{cf.old_value}</span> → <span className="text-green-600">{cf.new_value}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Snapshot panel */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {selectedEvent ? `Snapshot at v${selectedEvent.version}` : 'Click an event to view snapshot'}
            </h3>
            {selectedEvent?.snapshot ? (
              <div className="space-y-2">
                {Object.entries(selectedEvent.snapshot).filter(([k]) => !['captured_at'].includes(k)).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-gray-400 w-24 shrink-0 capitalize">{k.replace('_', ' ')}:</span>
                    <span className="text-gray-800 font-medium break-all">{String(v || '—').slice(0, 60)}</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 border-t pt-2 mt-2">
                  Captured: {new Date(selectedEvent.snapshot.captured_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No event selected</p>
            )}
          </div>
        </div>
      ) : selectedPatient ? (
        <div className="card p-10 text-center text-gray-400 text-sm">
          No timeline events for this patient yet
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Select a patient above to view their identity timeline</p>
        </div>
      )}
    </div>
  );
}
