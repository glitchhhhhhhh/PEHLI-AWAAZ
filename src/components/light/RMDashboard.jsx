import React from 'react';
import { useStateStore } from '../../store';

export default function RMDashboard() {
  const leadScore = useStateStore((s) => s.leadScore); // E.g. 82

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-8 gap-8">
      
      {/* Header */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">RM Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, Arjun Singh</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
            <span>12 May — 18 May, 2025</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <img src="https://avatar.iran.liara.run/public/33" alt="User" className="w-10 h-10 rounded-full border border-slate-200" />
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Hot Leads', icon: '🔥', value: '128', change: '+18%', color: 'red', points: '0,50 20,40 40,60 60,30 80,45 100,20 120,35 140,10 160,25 180,5 200,20' },
          { title: 'Warm Leads', icon: '☀️', value: '256', change: '+12%', color: 'amber', points: '0,30 20,45 40,30 60,50 80,40 100,60 120,40 140,55 160,40 180,45 200,30' },
          { title: 'Cold Leads', icon: '❄️', value: '364', change: '-8%', color: 'blue', isDown: true, points: '0,20 20,40 40,30 60,50 80,45 100,30 120,50 140,40 160,60 180,50 200,70' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-card border-soft p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <span className="text-xl">{m.icon}</span>
              <h3 className="font-semibold text-slate-700">{m.title}</h3>
            </div>
            <div className="flex items-baseline gap-4 mb-8 relative z-10">
              <span className="text-5xl font-bold text-slate-900">{m.value}</span>
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${m.isDown ? 'text-red-500' : 'text-emerald-500'}`}>
                  {m.isDown ? '▼' : '▲'} {m.change}
                </span>
                <span className="text-[10px] text-slate-400">vs last 7 days</span>
              </div>
            </div>
            {/* Sparkline */}
            <svg viewBox="0 0 200 80" className="absolute bottom-0 left-0 w-full h-24 preserve-3d" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`grad-${m.color}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={`var(--color-${m.color}-500, ${m.color === 'red' ? '#ef4444' : m.color === 'amber' ? '#f59e0b' : '#3b82f6'})`} stopOpacity="0.2"/>
                  <stop offset="100%" stopColor={`var(--color-${m.color}-500, ${m.color === 'red' ? '#ef4444' : m.color === 'amber' ? '#f59e0b' : '#3b82f6'})`} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polyline points={`${m.points} 200,80 0,80`} fill={`url(#grad-${m.color})`} />
              <polyline points={m.points} fill="none" stroke={`var(--color-${m.color}-500, ${m.color === 'red' ? '#ef4444' : m.color === 'amber' ? '#f59e0b' : '#3b82f6'})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Intent Score Gauge */}
        <div className="bg-white rounded-2xl shadow-card border-soft p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 mb-6">Intent Score</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 200 100" className="w-full max-w-[240px]">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f1f5f9" strokeWidth="20" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#intentGrad)" strokeWidth="20" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * Math.min(leadScore, 100)) / 100} className="transition-all duration-1000" />
              <defs>
                <linearGradient id="intentGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center mt-6">
              <span className="text-4xl font-bold text-slate-900">{leadScore}</span>
              <span className="text-sm font-semibold text-slate-600">High Intent</span>
              <span className="text-xs font-semibold text-emerald-500 mt-1">▲ 15% <span className="text-slate-400 font-normal">vs last 7 days</span></span>
            </div>
            <div className="w-full flex justify-between text-xs text-slate-400 font-medium px-4 mt-2">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Top Intent Topics */}
        <div className="bg-white rounded-2xl shadow-card border-soft p-6">
          <h3 className="font-bold text-slate-900 mb-6">Top Intent Topics</h3>
          <div className="space-y-5">
            {[
              { label: 'Personal Loan', pct: 62 },
              { label: 'Home Loan', pct: 24 },
              { label: 'Business Loan', pct: 8 },
              { label: 'Credit Card', pct: 6 },
            ].map((t, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{t.label}</span>
                  <span className="font-semibold text-slate-900">{t.pct}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${t.pct}%`, opacity: 1 - i * 0.2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="bg-white rounded-2xl shadow-card border-soft p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 mb-6">Upcoming Follow-ups</h3>
          <div className="flex-1 space-y-4">
            {[
              { name: 'Rohit Sharma', time: 'Today, 11:00 AM', avatar: '11' },
              { name: 'Neha Verma', time: 'Today, 01:30 PM', avatar: '44' },
              { name: 'Amit Patel', time: 'Tomorrow, 10:00 AM', avatar: '13' },
            ].map((u, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <img src={`https://avatar.iran.liara.run/public/${u.avatar}`} alt={u.name} className="w-10 h-10 rounded-full border border-slate-200" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{u.name}</h4>
                    <p className="text-xs text-slate-500">{u.time}</p>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </button>
              </div>
            ))}
          </div>
          <button className="text-indigo-600 font-semibold text-sm self-start mt-4 hover:text-indigo-800">
            View All
          </button>
        </div>

      </div>
    </div>
  );
}
