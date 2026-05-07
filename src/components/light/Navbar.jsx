import React from 'react';

export default function Navbar({ onLaunch }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-20 flex items-center justify-between px-8">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 items-center h-8">
          {[1, 2, 3, 2, 1].map((h, i) => (
            <div key={i} className="w-1.5 bg-indigo-600 rounded-full" style={{ height: `${h * 6 + 6}px` }} />
          ))}
        </div>
        <span className="text-xl font-bold text-slate-900 tracking-tight">Pehli Awaaz</span>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
        <a href="#" className="hover:text-slate-900 transition-colors">Product</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Use Cases</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Resources</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Pricing</a>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors">
          Login
        </button>
        <button 
          onClick={onLaunch}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all"
        >
          Book a Demo
        </button>
      </div>
    </nav>
  );
}
