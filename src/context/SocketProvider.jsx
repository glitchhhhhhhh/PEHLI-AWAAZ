import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getWSClient } from '../services/websocket';
import { useConversationStore, useStateStore } from '../store';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const sessionIdRef = useRef(`session-${Date.now()}`);

  // Store actions
  const addMessage = useConversationStore((s) => s.addMessage);
  const setTyping = useConversationStore((s) => s.setTyping);
  const setRecording = useConversationStore((s) => s.setRecording);
  const clearConversation = useConversationStore((s) => s.clearConversation);
  
  const updateState = useStateStore((s) => s.updateState);
  const addThinkingStep = useStateStore((s) => s.addThinkingStep);
  const clearThinking = useStateStore((s) => s.clearThinking);
  const resetState = useStateStore((s) => s.resetState);

  useEffect(() => {
    const ws = getWSClient();
    
    const handlers = {
      onConnected: () => { setIsConnected(true); setError(null); },
      onDisconnected: () => { setIsConnected(false); },
      onSession: (sid) => { sessionIdRef.current = sid; },
      onThinking: (step) => addThinkingStep(step),
      onStateUpdate: (state) => updateState(state),
      onAIToken: (token) => { /* Handle streaming tokens if needed */ },
      onAIComplete: (text) => {
        setTyping(false);
        setIsProcessing(false);
        addMessage({ role: 'ai', text, timestamp: Date.now() });
      },
      onSTTResult: (data) => {
        addMessage({ role: 'user', text: data.text, timestamp: Date.now() });
      },
      onError: (err) => {
        setError(typeof err === 'string' ? err : 'Socket error occurred');
        setIsProcessing(false);
        setTyping(false);
      }
    };

    ws.connect(sessionIdRef.current, handlers);

    return () => {
      ws.disconnect();
    };
  }, [addMessage, addThinkingStep, setTyping, updateState]); // Basic dependencies

  const sendMessage = (text) => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setTyping(true);
    addMessage({ role: 'user', text, timestamp: Date.now() });
    
    const ws = getWSClient();
    if (ws.isConnected) {
      ws.sendText(text, 'hinglish');
    } else {
      setError('Not connected to server');
      setIsProcessing(false);
      setTyping(false);
    }
  };

  const startVoice = async () => {
    // Basic implementation for now to avoid crashes
    setRecording(true);
  };

  const stopVoice = () => {
    setRecording(false);
    setIsProcessing(true);
  };

  const resetSession = () => {
    sessionIdRef.current = `session-${Date.now()}`;
    clearConversation();
    resetState();
    window.location.reload(); // Hard reload is safest for now
  };

  const value = {
    isConnected,
    isProcessing,
    error,
    sendMessage,
    startVoice,
    stopVoice,
    resetSession,
    sessionId: sessionIdRef.current,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
