import { useState, useEffect } from 'react';
import { useUIStore } from '../../store';

const navItems = [
  { id: 'live_conversation', label: 'Dashboard', icon: 'M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5z M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4z M14 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z' },
  { id: 'conversations', label: 'Conversations', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { id: 'leads', label: 'Leads', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'analytics', label: 'Analytics', icon: 'M18 20V10 M12 20V4 M6 20v-6' },
  { id: 'knowledge', label: 'Knowledge', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  { id: 'integrations', label: 'Integrations', icon: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' }, // Approximate puzzle icon with some SVG shapes
  { id: 'settings', label: 'Settings', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
];

export default function DashboardLayout({ children }) {
  const activeScene = useUIStore((s) => s.activeScene);
  const setScene = useUIStore((s) => s.setScene);
  
  const [timer, setTimer] = useState(167); // 00:02:47

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* ════ Top Header ════ */}
      <header className="h-[72px] bg-white px-6 flex items-center justify-between shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex gap-3 items-center cursor-pointer" onClick={() => setScene('landing')}>
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5v14"/><path d="M22 10v4"/><path d="M7 5v14"/><path d="M2 10v4"/></svg>
            </div>
            <div>
              <h1 className="text-[19px] font-bold text-slate-900 leading-tight">Pehli Awaaz</h1>
              <p className="text-[11px] font-medium text-slate-500">AI Voice Assistant</p>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-2" />

          {/* Status & Timer */}
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600">Live</span>
            </div>
            <span className="text-sm font-medium text-slate-600 font-mono">{formatTime(timer)}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M17 5v14"/><path d="M22 10v4"/><path d="M7 5v14"/><path d="M2 10v4"/></svg>
          </button>
          <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <img src="https://avatar.iran.liara.run/public/boy?username=Arjun" alt="Arjun Mehta" className="w-9 h-9 rounded-full border border-slate-200" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-none">Arjun Mehta</span>
              <span className="text-[11px] font-medium text-slate-500 mt-1">Admin</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 ml-1"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </header>

      {/* ════ Body ════ */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-24 flex flex-col justify-between py-6 bg-white shrink-0 border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)] relative z-0">
          <nav className="flex flex-col gap-4 items-center">
            {navItems.map((item) => {
              const isActive = activeScene === item.id || (item.id === 'live_conversation' && activeScene === 'live_conversation'); // In this mode, live is dashboard
              return (
                <button
                  key={item.id}
                  onClick={() => setScene(item.id)}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
                    isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1">
                    <path d={item.icon} />
                  </svg>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>{item.label}</span>
                </button>
              )
            })}
          </nav>
          
          <div className="flex flex-col items-center">
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl text-indigo-500 hover:bg-indigo-50 transition-all">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              <span className="text-[10px] font-semibold text-indigo-600">Need Help?</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-hidden flex flex-col relative">
          {children}
        </main>

      </div>
    </div>
  );
}
