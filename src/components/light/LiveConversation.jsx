import { useEffect, useRef, useState, useMemo } from 'react';
import { useConversationStore, useStateStore } from '../../store';
import { useSocket } from '../../hooks/useSocket';

export default function LiveConversation() {
  const [inputText, setInputText] = useState('');
  const messages = useConversationStore((s) => s.messages);
  const isRecording = useConversationStore((s) => s.isRecording);
  
  const intent = useStateStore((s) => s.intent);
  const trustScore = useStateStore((s) => s.trustScore);
  const strategy = useStateStore((s) => s.strategy);
  const persona = useStateStore((s) => s.persona);

  const { sendMessage, startVoice, stopVoice, resetSession, startScenario, sessionId } = useSocket();

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const toggleMic = () => {
    if (isRecording) stopVoice();
    else startVoice();
  };

  const isTyping = useConversationStore((s) => s.isAITyping);
  const thinkingSteps = useStateStore((s) => s.thinkingSteps);
  const leadScore = useStateStore((s) => s.leadScore);
  const leadClass = useStateStore((s) => s.leadClass);
  const memoryFacts = useStateStore((s) => s.memoryFacts);
  const intentScore = useStateStore((s) => s.intentScore);
  const emotion = useStateStore((s) => s.emotion);
  const aiConfidence = useStateStore((s) => s.aiConfidence);
  const conversionProbability = useStateStore((s) => s.conversionProbability);
  const strategyReason = useStateStore((s) => s.strategyReason);
  
  const playAudio = (url) => {
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  // Fixed heights for the recording animation to satisfy purity rules
  const randomHeights = [18, 24, 32, 20, 28, 22, 16];

  
  // Only show demo if no messages
  const displayMessages = messages.length > 0 ? messages : [];
  
  // Current time for bottom bar (stable for this render)
  const currentTime = useMemo(() => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), []);


  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* ════ Main 3-Panel Area ════ */}
      <div className="flex-1 flex gap-6 overflow-hidden px-6 pt-6 pb-6">
        
        {/* Panel 1: Conversation */}
        <div className="w-[360px] bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col overflow-hidden shrink-0">
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-50">
            <h2 className="text-lg font-bold text-slate-900">Conversation</h2>
            <div className="flex items-center gap-3 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {displayMessages.map((msg, i) => (
              <div key={msg.id || i} className="flex gap-4">
                {/* Avatar */}
                {msg.role === 'user' ? (
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-indigo-500 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M17 5v14"/><path d="M22 10v4"/><path d="M7 5v14"/><path d="M2 10v4"/></svg>
                  </div>
                )}
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-bold ${msg.role === 'user' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                      {msg.role === 'user' ? 'User' : 'Pehli Awaaz AI'}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.role === 'ai' && msg.audioUrl && (
                        <button 
                          onClick={() => playAudio(msg.audioUrl)}
                          className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        </button>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(msg.timestamp || 0).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-slate-50 border border-slate-100' : 'bg-emerald-50/50 border border-emerald-100/50'}`}>
                    <p className="text-[14px] text-slate-700 leading-relaxed break-words">
                      {msg.text || (msg.role === 'ai' ? '...' : '')}
                    </p>
                  </div>
                  {msg.role === 'ai' && isTyping && i === displayMessages.length - 1 && (
                    <div className="mt-2 flex items-center gap-1 h-4 px-2">
                      {[1,2,3,4,3,2,1].map((h, j) => (
                        <div key={j} className="w-1 bg-indigo-400 rounded-full animate-pulse" style={{ height: `${h * 4}px`, animationDelay: `${j*100}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-50">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (inputText.trim()) {
                  sendMessage(inputText);
                  setInputText('');
                }
              }}
              className="flex items-center gap-2 mb-3"
            >
              <button 
                type="button"
                onClick={toggleMic}
                className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="w-11 h-11 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
            {isTyping && (
              <div className="flex items-center gap-2 px-2 text-indigo-500">
                <span className="text-[11px] font-semibold">AI is thinking...</span>
                <div className="flex items-center gap-0.5 h-3 opacity-80">
                  {[1,2,3,4,3,2,1].map((h, i) => (
                    <div key={i} className="w-0.5 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${h * 3 + 2}px`, animationDelay: `${i*100}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Orb */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          
          {/* Orbital Graphic */}
          <div className="relative w-80 h-80 flex items-center justify-center cursor-pointer" onClick={toggleMic}>
            {/* Outer rings */}
            <div className="absolute inset-0 rounded-full border border-indigo-100/40 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-indigo-200/30 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-8 rounded-full border border-indigo-300/20" />
            
            {/* Soft Glow */}
            <div className="absolute inset-10 bg-indigo-400/10 rounded-full blur-2xl" />
            
            {/* Inner Gradient Orb */}
            <div className={`relative w-48 h-48 rounded-full shadow-[0_0_50px_rgba(99,102,241,0.4)] flex items-center justify-center overflow-hidden transition-all duration-500 ${isRecording ? 'scale-105' : 'scale-100'}`}
                 style={{ background: 'linear-gradient(135deg, #818CF8 0%, #C084FC 50%, #6366F1 100%)' }}>
              <div className="absolute inset-0 bg-white/20 blur-md rounded-full mix-blend-overlay" />
              <div className="relative flex items-center gap-1.5 h-12 z-10">
                {[1,3,5,7,5,3,1].map((h, i) => (
                  <div key={i} className={`w-1.5 bg-white rounded-full ${isRecording ? 'animate-pulse' : ''}`} style={{ height: `${isRecording ? randomHeights[i] : h * 6 + 10}px` }} />
                ))}
              </div>
            </div>
            
            {/* Particles */}
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-indigo-400 rounded-full" />
            <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full" />
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full" />
          </div>

          <div className="mt-8 text-center space-y-2">
            <h2 className="text-2xl font-bold text-indigo-600 tracking-tight">Listening...</h2>
            <p className="text-sm font-medium text-slate-500">AI is actively listening to the user</p>
          </div>

          <button 
            onClick={resetSession}
            className="mt-10 flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-md border border-slate-100 text-red-500 font-bold hover:bg-red-50 transition-all hover:scale-105"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/></svg>
            End Conversation
          </button>

        </div>

        {/* Panel 3: Analytics */}
        <div className="w-[340px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
          
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="text-[17px] font-bold text-slate-900">Real-time Analytics</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Live Analysis</span>
            </div>
          </div>

          {/* Scenario Quick Selector (Demo Mode) */}
          <div className="bg-indigo-600 rounded-2xl p-4 shadow-lg mb-2">
            <h4 className="text-white text-[12px] font-bold uppercase tracking-widest mb-3 opacity-80">Test Scenarios</h4>
            <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'hot', label: '🔥 Hot Lead', color: 'bg-red-400' },
                  { id: 'warm', label: '⚡ Warm Lead', color: 'bg-amber-400' },
                  { id: 'cold', label: '🧊 Cold Lead', color: 'bg-blue-400' },
                  { id: 'multi', label: '🌍 Multi-lingual', color: 'bg-emerald-400' }
                ].map(s => (
                  <button 
                    key={s.id}
                    onClick={() => startScenario(s.id)}
                    className="flex items-center justify-center py-2 px-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/10 transition-all"
                  >
                    {s.label}
                  </button>
                ))}
            </div>
          </div>

          {/* Intent Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 font-bold text-[15px]">
              Intent Score <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="flex items-center gap-5">
              {/* Circular Progress */}
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4F46E5" strokeWidth="3" strokeDasharray={`${intentScore * 10}, 100`} />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-[20px] font-bold text-slate-900 leading-none">{Math.round(intentScore * 10)}</span>
                  <span className="text-[10px] font-semibold text-slate-500 border-t border-slate-200 mt-0.5 pt-0.5">/100</span>
                </div>
              </div>
              <div>
                <h4 className="text-indigo-600 font-bold text-[15px] mb-1">{intent.toUpperCase()} Intent</h4>
                <p className="text-[12px] font-medium text-slate-500 leading-snug">Current strategy: {strategy.split('_').join(' ')}</p>
                <div className="mt-2 inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded text-[10px] font-bold">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                  Live <span className="text-slate-400 font-medium">Tracking</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 font-bold text-[15px]">
              Trust Score <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeDasharray={`${trustScore * 100}, 100`} />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-[20px] font-bold text-slate-900 leading-none">{Math.round(trustScore * 100)}</span>
                  <span className="text-[10px] font-semibold text-slate-500 border-t border-slate-200 mt-0.5 pt-0.5">/100</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sky-500 font-bold text-[15px] mb-0.5">Building Trust</h4>
                <p className="text-[12px] font-medium text-slate-500 truncate">Persona: {persona.toUpperCase()}</p>
                <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-tight">{emotion} Detected</p>
              </div>
            </div>
          </div>

          {/* AI Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
             {/* Confidence Card */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">AI Confidence</div>
                <div className="text-xl font-black text-slate-800">{Math.round(aiConfidence * 100)}%</div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${aiConfidence * 100}%` }} />
                </div>
             </div>
             {/* Conversion Prob Card */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Conv. Prob.</div>
                <div className="text-xl font-black text-slate-800">{Math.round(conversionProbability * 100)}%</div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${conversionProbability * 100}%` }} />
                </div>
             </div>
          </div>

          {/* Lead Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
             <div className="flex items-center gap-1.5 mb-5 text-slate-800 font-bold text-[15px]">
              Lead Status <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="h-2 rounded-full w-full bg-gradient-to-r from-blue-200 via-amber-300 to-red-500 relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-400 rounded-full shadow-sm transition-all duration-500`} 
                       style={{ left: `${leadScore * 10}%`, borderColor: leadClass === 'hot' ? '#ef4444' : leadClass === 'warm' ? '#f59e0b' : '#3b82f6' }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                  <span className={leadClass === 'cold' ? 'text-blue-500' : ''}>Cold</span>
                  <span className={leadClass === 'warm' ? 'text-amber-500' : ''}>Warm</span>
                  <span className={leadClass === 'hot' ? 'text-red-500' : ''}>Hot</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${leadClass === 'hot' ? 'bg-red-50 text-red-500' : leadClass === 'warm' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 13.5c0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5 2.25-5.5 4.5-8.5c2.25 3 4.5 6 4.5 8.5z"/></svg>
                </div>
                <span className={`text-[11px] font-bold mt-1 ${leadClass === 'hot' ? 'text-red-600' : leadClass === 'warm' ? 'text-amber-600' : 'text-blue-600'}`}>{leadClass.toUpperCase()} Lead</span>
              </div>
            </div>
            <p className="mt-4 text-[11px] font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-indigo-600 uppercase text-[9px] block mb-1">Suggested Strategy</span>
              {strategyReason}
            </p>
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 font-bold text-[15px]">
              Key Insights <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="space-y-3">
              {memoryFacts.length > 0 ? memoryFacts.map((fact, i) => (
                <div key={i} className="flex gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 mt-0.5 text-indigo-500"><path d="M13.5 13.48l-4-4L2 16.99l1.5 1.5 6-6.01 4 4L22 6.92l-1.41-1.41z"/></svg>
                  <span className="text-[12px] font-medium text-slate-600">{fact}</span>
                </div>
              )) : (
                <p className="text-[12px] font-medium text-slate-400">No key insights gathered yet.</p>
              )}
              {thinkingSteps.slice(-3).map((step, i) => (
                <div key={`step-${i}`} className="flex gap-3 opacity-60">
                   <div className="w-1 h-1 rounded-full bg-slate-300 mt-2 shrink-0" />
                   <span className="text-[11px] italic text-slate-500">{step}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ════ Bottom Bar ════ */}
      <div className="h-16 bg-white shrink-0 flex items-center justify-between px-6 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        
        <div className="flex items-center gap-6 h-full">
          {/* Help Action */}
          <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-[13px] mr-4">
             <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
             </div>
             Need Help?
          </button>

          <div className="w-px h-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Lead Name</span>
              <span className="text-[13px] text-slate-900 font-bold">Rohit Sharma</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Phone</span>
              <span className="text-[13px] text-slate-900 font-bold">+91 98765 43210</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Source</span>
              <span className="text-[13px] text-slate-900 font-bold">Website</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center font-bold">
              #
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Session ID</span>
              <span className="text-[13px] text-slate-900 font-bold">#{sessionId?.slice(-6).toUpperCase() || '---'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Time</span>
              <span className="text-[13px] text-slate-900 font-bold">{currentTime}</span>
            </div>
          </div>

        </div>

        <button className="flex items-center gap-2 px-6 py-2 rounded-xl border border-slate-200 text-indigo-600 font-bold text-[13px] hover:bg-slate-50 transition-colors h-10">
          View Lead 
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>

    </div>
  );
}
