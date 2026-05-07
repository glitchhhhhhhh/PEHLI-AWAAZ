/**
 * useBackend.js — React hook that wires Zustand stores to the real FastAPI backend.
 *
 * Supports two modes:
 *   1. REST mode  — standard request/response via api.js
 *   2. WebSocket mode — real-time streaming via websocket.js
 *
 * Drop-in replacement for the demo engine.
 *
 * Usage:
 *   const { sendMessage, startVoice, stopVoice, isConnected, mode } = useBackend();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversationStore, useStateStore } from '../store';
import { sendMessage as apiSendMessage, uploadVoice } from '../services/api';
import { getWSClient } from '../services/websocket';

// ── Helpers ──────────────────────────────────────────────

/**
 * Map snake_case backend state to camelCase frontend state.
 */
function mapStateToStore(backendState) {
  if (!backendState) return {};
  return {
    intent: backendState.intent,
    trustScore: backendState.trust_score,
    persona: backendState.persona,
    objection: backendState.objection,
    engagementScore: backendState.engagement_score,
    strategy: backendState.strategy,
    strategyReason: backendState.strategy_reason,
    conversationStage: backendState.conversation_stage,
    language: backendState.language,
    leadScore: backendState.lead_score,
    leadClass: backendState.lead_class,
    memoryFacts: backendState.memory_facts || [],
    thinkingSteps: backendState.thinking_steps || [],
    memoryTriggered: backendState.memory_triggered || false,
  };
}


// ── Main Hook ────────────────────────────────────────────

/**
 * @param {Object} options
 * @param {'rest'|'websocket'} options.mode - Communication mode
 * @param {boolean} options.autoConnect - Auto-connect WebSocket on mount
 */
export function useBackend({ mode = 'websocket', autoConnect = true } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(null);
  const streamingTextRef = useRef('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const ttsChunksRef = useRef([]);

  // Zustand store actions
  const addMessage = useConversationStore((s) => s.addMessage);
  const setTyping = useConversationStore((s) => s.setTyping);
  const updateState = useStateStore((s) => s.updateState);
  const addThinkingStep = useStateStore((s) => s.addThinkingStep);
  const clearThinking = useStateStore((s) => s.clearThinking);

  // ── WebSocket Setup ──────────────────────────────────

  useEffect(() => {
    if (mode !== 'websocket' || !autoConnect) return;

    const ws = getWSClient();
    const sid = sessionIdRef.current || `session-${Date.now()}`;
    sessionIdRef.current = sid;

    ws.connect(sid, {
      onConnected: () => {
        console.log('[useBackend] WebSocket connected');
        setIsConnected(true);
        setError(null);
      },

      onDisconnected: () => {
        console.log('[useBackend] WebSocket disconnected');
        setIsConnected(false);
      },

      onSession: (newSid) => {
        sessionIdRef.current = newSid;
      },

      onThinking: (step) => {
        addThinkingStep(step);
      },

      onStateUpdate: (state) => {
        const mapped = mapStateToStore(state);
        updateState(mapped);
      },

      onAIToken: (token) => {
        streamingTextRef.current += token;
      },

      onAIComplete: (text) => {
        setTyping(false);
        setIsProcessing(false);
        addMessage({
          role: 'ai',
          text: text || streamingTextRef.current,
          language: 'hinglish',
        });
        streamingTextRef.current = '';
      },

      onSTTResult: (data) => {
        // Add the transcribed user message
        addMessage({
          role: 'user',
          text: data.text,
          language: data.language || 'hinglish',
        });
      },

      onTTSChunk: (audioData) => {
        // Accumulate binary TTS chunks
        ttsChunksRef.current.push(audioData);
      },

      onTTSComplete: () => {
        // Play the accumulated TTS audio
        if (ttsChunksRef.current.length > 0) {
          try {
            const blob = new Blob(ttsChunksRef.current, { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play().catch(e => console.error('TTS play error:', e));
          } catch (err) {
            console.error('Failed to create TTS blob:', err);
          }
          ttsChunksRef.current = [];
        }
      },

      onError: (detail) => {
        console.error('[useBackend] Error:', detail);
        setError(detail);
        setIsProcessing(false);
        setTyping(false);
      },
    });

    return () => {
      ws.disconnect();
      setIsConnected(false);
    };
  }, [mode, autoConnect, addMessage, setTyping, updateState, addThinkingStep, clearThinking]);

  // ── Send Text Message ────────────────────────────────

  const sendMessage = useCallback(
    async (text, language = 'hinglish') => {
      if (!text.trim()) return;

      setError(null);
      setIsProcessing(true);

      // Add user message to store immediately
      addMessage({ role: 'user', text, language });
      setTyping(true);
      clearThinking();

      if (mode === 'websocket') {
        // Stream via WebSocket
        const ws = getWSClient();
        if (ws.isConnected) {
          streamingTextRef.current = '';
          ws.sendText(text, language);
        } else {
          // Fallback to REST if WS disconnected
          await _sendViaREST(text, language);
        }
      } else {
        // REST mode
        await _sendViaREST(text, language);
      }
    },
    [mode, addMessage, setTyping, clearThinking, updateState],
  );

  async function _sendViaREST(text, language) {
    try {
      const response = await apiSendMessage(text, sessionIdRef.current, language);
      sessionIdRef.current = response.session_id;

      // Stream thinking steps with delay for UX
      if (response.thinking_steps) {
        for (const step of response.thinking_steps) {
          addThinkingStep(step);
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      // Update state
      const mapped = mapStateToStore(response.state);
      updateState(mapped);

      // Add AI response
      setTyping(false);
      addMessage({
        role: 'ai',
        text: response.ai_reply,
        language: response.state?.language || 'hinglish',
      });
    } catch (err) {
      console.error('[useBackend] REST error:', err);
      setError(err.message);
      setTyping(false);

      addMessage({
        role: 'ai',
        text: `⚠️ Connection error: ${err.message}`,
        language: 'english',
      });
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Voice Recording ──────────────────────────────────

  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);

          // In WebSocket mode, stream chunks in real-time
          if (mode === 'websocket') {
            const ws = getWSClient();
            if (ws.isConnected) {
              ws.sendAudio(e.data);
            }
          }
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // Collect chunks every 250ms
      mediaRecorderRef.current = recorder;

      useConversationStore.getState().setRecording(true);
    } catch (err) {
      console.error('[useBackend] Microphone error:', err);
      setError('Microphone access denied. Please enable microphone access.');
    }
  }, [mode]);

  const stopVoice = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    useConversationStore.getState().setRecording(false);
    setIsProcessing(true);
    setTyping(true);
    clearThinking();

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((t) => t.stop());

        if (mode === 'websocket') {
          // Send end-of-audio signal
          const ws = getWSClient();
          if (ws.isConnected) {
            ws.endAudio();
          }
        } else {
          // REST mode: upload the whole recording
          try {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const response = await uploadVoice(blob, sessionIdRef.current);
            sessionIdRef.current = response.session_id;

            // Add user transcript
            addMessage({
              role: 'user',
              text: response.transcript,
              language: response.language,
            });

            // Stream thinking (simulated delay for REST)
            if (response.state?.thinking_steps) {
              for (const step of response.state.thinking_steps) {
                addThinkingStep(step);
                await new Promise((r) => setTimeout(r, 150));
              }
            }

            // Update state
            const mapped = mapStateToStore(response.state);
            updateState(mapped);

            // Add AI response
            setTyping(false);
            addMessage({
              role: 'ai',
              text: response.ai_reply,
              language: response.language,
            });

            // Play audio if available
            if (response.audio_url) {
              const audio = new Audio(response.audio_url);
              audio.play().catch(() => {});
            }
          } catch (err) {
            console.error('[useBackend] Voice upload error:', err);
            setError(err.message);
            setTyping(false);
          }
          setIsProcessing(false);
        }

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve();
      };

      recorder.stop();
    });
  }, [mode, addMessage, setTyping, clearThinking, updateState, addThinkingStep]);

  // ── Reset ────────────────────────────────────────────

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    streamingTextRef.current = '';
    setError(null);
    useConversationStore.getState().clearConversation();
    useStateStore.getState().resetState();

    // Reconnect WebSocket with new session
    if (mode === 'websocket') {
      const ws = getWSClient();
      ws.disconnect();
      const newSid = `session-${Date.now()}`;
      sessionIdRef.current = newSid;
      // Will reconnect on next message or can call connect manually
    }
  }, [mode]);

  return {
    sendMessage,
    startVoice,
    stopVoice,
    resetSession,
    isConnected,
    isProcessing,
    error,
    mode,
    sessionId: sessionIdRef.current,
  };
}

export default useBackend;
