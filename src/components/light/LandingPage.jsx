import React from 'react';
import Navbar from './Navbar';

export default function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <Navbar onLaunch={onLaunch} />
      
      {/* Soft Gradient Mesh Background */}
      <div className="absolute inset-0 bg-mesh-light opacity-60 pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center pt-32 px-6 relative z-10">
        
        {/* Top pill label */}
        <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-semibold mb-8">
          AI Voice Platform for Financial Teams
        </div>

        {/* Hero Typography */}
        <h1 className="heading-1 text-slate-900 text-center max-w-4xl mb-6">
          Convert Every <br className="hidden md:block" />
          Lead in <span className="text-indigo-600">Real-Time</span>
        </h1>
        
        <p className="text-slate-500 text-lg text-center max-w-2xl mb-10">
          AI Voice Agents that understand, personalize and convert — in every conversation.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <button 
            onClick={onLaunch}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
          >
            Book a Demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <button className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white border border-gray-200 text-slate-700 font-semibold hover:bg-gray-50 shadow-sm transition-all">
            See How It Works
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4V8z"/></svg>
          </button>
        </div>

        {/* Central Audio Graphic */}
        <div className="w-full max-w-5xl relative flex items-center justify-center h-32 mb-20">
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20">
             {[...Array(60)].map((_, i) => (
               <div key={i} className="w-1.5 bg-indigo-600 rounded-full" style={{ height: `${Math.random() * 80 + 10}px` }} />
             ))}
          </div>
          <div className="relative z-10 w-20 h-20 bg-white rounded-full shadow-float flex items-center justify-center border border-indigo-50">
            <div className="absolute inset-0 rounded-full border border-indigo-100 scale-110" />
            <div className="absolute inset-0 rounded-full border border-indigo-50 scale-125" />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </div>
        </div>

        {/* Trust Banner */}
        <div className="w-full max-w-5xl border-t border-gray-200 pt-10 pb-16 flex flex-wrap items-center justify-between gap-8 opacity-60 grayscale">
          {['HDFC BANK', 'ICICI Bank', 'BAJAJ FINSERV', 'kotak', 'AXIS BANK'].map((logo, i) => (
            <div key={i} className="text-xl font-bold font-sans tracking-tighter text-slate-400">{logo}</div>
          ))}
        </div>

      </main>
    </div>
  );
}
