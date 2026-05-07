import React from 'react';

export default function AnalyticsDashboard() {
  const funnelData = [
    { label: 'Total Leads', before: '10,000', after: '10,000', wBefore: '100%', wAfter: '100%' },
    { label: 'Connected', before: '3,200', after: '5,600', trend: '▲ 75%', wBefore: '80%', wAfter: '90%' },
    { label: 'Engaged', before: '1,520', after: '3,360', trend: '▲ 121%', wBefore: '60%', wAfter: '75%' },
    { label: 'Qualified', before: '620', after: '1,850', trend: '▲ 198%', wBefore: '40%', wAfter: '55%' },
    { label: 'Converted', before: '220', after: '880', trend: '▲ 300%', wBefore: '25%', wAfter: '40%' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-8 gap-8">
      
      {/* Header */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Analytics</h1>
          <p className="text-sm text-slate-500">Track performance and conversion impact</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
            <span>12 May — 18 May, 2025</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm hover:bg-slate-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        
        {/* Funnel Chart */}
        <div className="flex-1 bg-white rounded-2xl shadow-card border-soft p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 text-lg">Conversion Funnel: Before vs After Pehli Awaaz</h3>
            <div className="flex items-center gap-6 text-sm font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-300" />
                <span className="text-slate-600">Before Pehli Awaaz</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-indigo-500" />
                <span className="text-slate-600">After Pehli Awaaz</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-6">
            {funnelData.map((step, i) => (
              <div key={i} className="flex items-center gap-8 group">
                <div className="w-32 text-sm font-semibold text-slate-700 shrink-0">{step.label}</div>
                
                <div className="flex-1 flex justify-center h-16 relative">
                  {/* Before Shape (Grey) */}
                  <div 
                    className="absolute right-1/2 h-full bg-slate-200 border-r-2 border-white flex items-center justify-end pr-8 rounded-l-lg transition-all"
                    style={{ width: `calc(${step.wBefore} / 2)`, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 5% 100%)' }}
                  >
                    <span className="text-sm font-bold text-slate-600">{step.before}</span>
                  </div>
                  
                  {/* After Shape (Purple) */}
                  <div 
                    className="absolute left-1/2 h-full bg-indigo-500 flex items-center justify-start pl-8 rounded-r-lg transition-all"
                    style={{ width: `calc(${step.wAfter} / 2)`, clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)', opacity: 1 - (i * 0.1) }}
                  >
                    <span className="text-sm font-bold text-white">{step.after}</span>
                  </div>
                </div>
                
                <div className="w-24 shrink-0 text-right">
                  {step.trend && <span className="text-sm font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">{step.trend}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Metrics */}
        <div className="w-[320px] shrink-0 flex flex-col gap-6">
          {[
            { label: 'Conversion Rate', before: '2.2%', after: '8.8%', trend: '▲ 300%' },
            { label: 'Average Talk Time', before: '2m 15s', after: '4m 35s', trend: '▲ 107%' },
            { label: 'Lead Quality Score', before: '56/100', after: '87/100', trend: '▲ 55%' },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card border-soft p-6">
              <h3 className="font-bold text-slate-900 mb-6">{m.label}</h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Before</div>
                  <div className="text-2xl font-bold text-slate-700">{m.before}</div>
                </div>
                <div className="text-slate-300 pb-2">→</div>
                <div>
                  <div className="text-xs font-semibold text-indigo-500 mb-1 uppercase tracking-wider">After</div>
                  <div className="text-3xl font-bold text-indigo-600">{m.after}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">{m.trend}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
