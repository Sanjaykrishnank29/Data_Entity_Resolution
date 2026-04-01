import React, { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../api';
import { Circle } from 'lucide-react';

export default function EngineLog({ maxLines = 80, height = 'h-64' }) {
  const [logs, setLogs] = useState([
    { timestamp: new Date().toISOString(), message: '🔌 Connecting to DataDNA engine...', level: 'info' }
  ]);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL);
        wsRef.current.onopen = () => {
          setLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            message: '✅ Connected to engine log stream',
            level: 'success'
          }].slice(-maxLines));
        };
        wsRef.current.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            setLogs(prev => [...prev, data].slice(-maxLines));
          } catch {
            setLogs(prev => [...prev, {
              timestamp: new Date().toISOString(),
              message: evt.data,
              level: 'info'
            }].slice(-maxLines));
          }
        };
        wsRef.current.onerror = () => {
          setLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            message: '⚠️ Engine connection lost — retrying in 5s...',
            level: 'warning'
          }].slice(-maxLines));
        };
        wsRef.current.onclose = () => {
          setTimeout(connect, 5000);
        };
      } catch (e) {
        console.error('WS error:', e);
      }
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const levelColor = {
    success: 'text-green-400',
    error:   'text-red-400',
    warning: 'text-amber-400',
    info:    'text-gray-400',
  };

  return (
    <div className={`bg-gray-950 rounded-xl ${height} overflow-y-auto p-4 font-mono text-xs`}>
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2 mb-1 animate-fade-in">
          <span className="text-gray-600 shrink-0">
            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span className={`${levelColor[log.level] || 'text-gray-300'} break-all`}>
            {log.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
