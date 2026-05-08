import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getWSClient } from '../services/websocket';
import { useConversationStore, useStateStore } from '../store';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Store actions
  const addMessage = useConversationStore((s) => s.addMessage);
  const updateLastMessage = useConversationStore((s) => s.updateLastMessage);
  const setTyping = useConversationStore((s) => s.setTyping);
  const setRecording = useConversationStore((s) => s.setRecording);
  const clearConversation = useConversationStore((s) => s.clearConversation);
  
  const updateState = useStateStore((s) => s.updateState);
  const addThinkingStep = useStateStore((s) => s.addThinkingStep);
  const clearThinking = useStateStore((s) => s.clearThinking);
  const resetState = useStateStore((s) => s.resetState);

  const hasAIStartedRef = useRef(false);

  // ── Audio Playback Engine (Gapless Streaming) ────────────────
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playNextChunk = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift();
    
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(chunk);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };
      source.start(0);
    } catch (e) {
      console.error('[Audio] Playback error:', e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  };

  // ── WebSocket Setup ──────────────────────────────────────────
  useEffect(() => {
    const ws = getWSClient();
    
    const handlers = {
      onConnected: () => { setIsConnected(true); setError(null); },
      onDisconnected: () => { setIsConnected(false); },
      onSession: (sid) => { sessionIdRef.current = sid; },
      onThinking: (step) => addThinkingStep(step),
      onStateUpdate: (state) => updateState(state),
      onAIToken: (token) => {
        if (!hasAIStartedRef.current) {
          hasAIStartedRef.current = true;
          addMessage({ role: 'ai', text: token, timestamp: Date.now() });
        } else {
          updateLastMessage(token);
        }
      },
      onAIComplete: (text) => {
        setTyping(false);
        setIsProcessing(false);
        if (!hasAIStartedRef.current) {
          addMessage({ role: 'ai', text, timestamp: Date.now() });
        }
        hasAIStartedRef.current = false;
        clearThinking();
      },
      onSTTResult: (data) => {
        addMessage({ role: 'user', text: data.text, timestamp: Date.now() });
      },
      onTTSChunk: (chunk) => {
        initAudioContext();
        audioQueueRef.current.push(chunk);
        playNextChunk();
      },
      onTTSComplete: () => {
        console.log('[TTS] Synthesis complete');
      },
      onError: (err) => {
        setError(typeof err === 'string' ? err : 'Socket error occurred');
        setIsProcessing(false);
        setTyping(false);
        hasAIStartedRef.current = false;
      }
    };

    ws.connect(sessionIdRef.current, handlers);

    return () => {
      ws.disconnect();
    };
  }, []); // Run once on mount

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initAudioContext();
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      
      const ws = getWSClient();
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.isConnected) {
          ws.sendAudio(e.data);
        }
      };
      
      recorder.start(250); // Send 250ms chunks
      setRecording(true);
      setError(null);
    } catch (e) {
      console.error('[Mic] Access denied:', e);
      setError('Microphone access denied');
    }
  };

  const stopVoice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      
      const ws = getWSClient();
      if (ws.isConnected) {
        ws.endAudio(); // Signal end of audio
      }
    }
    setRecording(false);
    setIsProcessing(true);
    setTyping(true);
  };

  const resetSession = () => {
    const ws = getWSClient();
    ws.disconnect();
    sessionIdRef.current = `session-${Date.now()}`;
    clearConversation();
    resetState();
    window.location.reload(); 
  };

  const startScenario = (scenarioId) => {
    setIsProcessing(true);
    setTyping(true);
    const ws = getWSClient();
    if (ws.isConnected) {
      ws.sendScenario(scenarioId);
    } else {
      setError('Not connected to server');
      setIsProcessing(false);
      setTyping(false);
    }
  };

  const value = {
    isConnected,
    isProcessing,
    error,
    sendMessage,
    startVoice,
    stopVoice,
    resetSession,
    startScenario,
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
