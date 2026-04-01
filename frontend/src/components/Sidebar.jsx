import React from 'react';
import { NavLink } from 'react-router-dom';
import { Layers, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/ingest',       label: 'Data Ingestion',   emoji: '📥' },
  { to: '/explorer',     label: 'Data Explorer',    emoji: '🔍' },
  { to: '/intelligence', label: 'Intelligence Hub', emoji: '🧠' },
  { to: '/monitor',      label: 'Live Monitoring',  emoji: '⚡', live: true },
  { to: '/command',      label: 'Command Center',   emoji: '📊' },
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen shrink-0 shadow-sm font-sans">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tighter text-gray-900">INFYND</span>
            <p className="text-[10px] text-red-600 font-bold leading-none mt-0.5 uppercase tracking-widest">Data DNA</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, emoji, live }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-black'
              }`
            }
          >
            <span className="text-base">{emoji}</span>
            <span className="flex-1">{label}</span>
            {live && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-xs font-black text-red-600">IN</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-400 font-medium">Infynd Workspace</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
