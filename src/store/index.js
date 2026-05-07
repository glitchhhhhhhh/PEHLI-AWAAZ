import { create } from 'zustand';

export const useConversationStore = create((set, get) => ({
  messages: [],
  isRecording: false,
  isAITyping: false,
  inputMode: 'text',

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { ...msg, id: Date.now() + Math.random(), timestamp: new Date().toISOString(), audioUrl: msg.audioUrl || null }] })),

  setTyping: (v) => set({ isAITyping: v }),
  setRecording: (v) => set({ isRecording: v }),
  setInputMode: (m) => set({ inputMode: m }),
  clearConversation: () => set({ messages: [] }),
}));

export const useStateStore = create((set) => ({
  intent: 'cold',
  intentScore: 0.0,
  trustScore: 0.5,
  persona: 'unknown',
  secondaryPersona: null,
  personaConfidence: 0.0,
  objection: null,
  engagementScore: 1.0,
  strategy: 'educational_storytelling',
  strategyReason: 'Initial contact — building rapport',
  conversationStage: 'intro',
  language: 'hinglish',
  communicationStyle: 'Natural Hinglish',
  leadScore: 1.5,
  leadClass: 'cold',
  leadCategory: 'New Prospect',
  
  // Real-time AI Sales Demo additions
  emotion: 'neutral',
  aiConfidence: 0.8,
  conversionProbability: 0.1,

  memoryFacts: [],
  thinkingSteps: [],
  memoryTriggered: false,

  updateState: (partial) => set((s) => ({ ...s, ...partial })),
  addThinkingStep: (step) => set((s) => ({ thinkingSteps: [...s.thinkingSteps, step] })),
  clearThinking: () => set({ thinkingSteps: [] }),
  resetState: () =>
    set({
      intent: 'cold', intentScore: 0.0, trustScore: 0.5, persona: 'unknown', 
      secondaryPersona: null, personaConfidence: 0.0, objection: null,
      engagementScore: 1.0, strategy: 'educational_storytelling',
      strategyReason: 'Initial contact — building rapport', conversationStage: 'intro',
      language: 'hinglish', communicationStyle: 'Natural Hinglish',
      leadScore: 1.5, leadClass: 'cold', leadCategory: 'New Prospect',
      emotion: 'neutral', aiConfidence: 0.8, conversionProbability: 0.1,
      memoryFacts: [], thinkingSteps: [], memoryTriggered: false,
    }),
}));

export const useUIStore = create((set) => ({
  activeScene: 'landing',
  cursorPos: { x: 0, y: 0 },
  showHandoff: false,
  showWhatsApp: false,
  neuralActiveNodes: [],

  setScene: (s) => set({ activeScene: s }),
  setCursorPos: (p) => set({ cursorPos: p }),
  setShowHandoff: (v) => set({ showHandoff: v }),
  setShowWhatsApp: (v) => set({ showWhatsApp: v }),
  setNeuralActiveNodes: (n) => set({ neuralActiveNodes: n }),
}));
