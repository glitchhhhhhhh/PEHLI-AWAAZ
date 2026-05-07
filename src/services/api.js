/**
 * api.js — REST API client for the Pehli Awaaz backend.
 *
 * Wraps all REST endpoints with error handling, retry logic,
 * and automatic JSON serialization.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── HTTP helpers ──────────────────────────────────────────

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  // Don't override Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(body.detail || `HTTP ${res.status}`);
      error.status = res.status;
      error.body = body;
      throw error;
    }
    return res;
  } catch (err) {
    if (!err.status) {
      // Network error
      err.message = `Network error: ${err.message}. Is the backend running at ${API_BASE}?`;
    }
    throw err;
  }
}

async function json(path, options = {}) {
  const res = await request(path, options);
  return res.json();
}

// ── Chat API ─────────────────────────────────────────────

/**
 * Send a text message and get AI response + state update.
 * @param {string} text - User's message
 * @param {string|null} sessionId - Session ID (auto-created if null)
 * @param {string} language - Language code: hinglish | hindi | english
 * @returns {Promise<{session_id, ai_reply, state, thinking_steps}>}
 */
export async function sendMessage(text, sessionId = null, language = 'hinglish') {
  return json('/api/chat/', {
    method: 'POST',
    body: JSON.stringify({
      text,
      session_id: sessionId,
      language,
    }),
  });
}

/**
 * Get message history for a session.
 * @param {string} sessionId
 * @param {number} limit - Max messages to return
 * @returns {Promise<{session_id, messages, count}>}
 */
export async function getMessages(sessionId, limit = 50) {
  return json(`/api/chat/${sessionId}/messages?limit=${limit}`);
}

/**
 * Get current AI brain state for a session.
 * @param {string} sessionId
 * @returns {Promise<{session_id, state}>}
 */
export async function getState(sessionId) {
  return json(`/api/chat/${sessionId}/state`);
}

/**
 * Delete a conversation session.
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  return json(`/api/chat/${sessionId}`, { method: 'DELETE' });
}

// ── Voice API ────────────────────────────────────────────

/**
 * Upload audio for STT → AI → TTS pipeline.
 * @param {Blob} audioBlob - Audio data
 * @param {string|null} sessionId
 * @param {string} filename
 * @returns {Promise<{session_id, transcript, language, ai_reply, state, audio_url}>}
 */
export async function uploadVoice(audioBlob, sessionId = null, filename = 'audio.webm') {
  const form = new FormData();
  form.append('audio', audioBlob, filename);
  if (sessionId) form.append('session_id', sessionId);

  return json('/api/voice/upload', {
    method: 'POST',
    body: form,
  });
}

/**
 * Convert text to speech.
 * @param {string} text
 * @returns {Promise<Blob>} - WAV audio blob
 */
export async function textToSpeech(text) {
  const form = new FormData();
  form.append('text', text);

  const res = await request('/api/voice/tts', {
    method: 'POST',
    body: form,
  });
  return res.blob();
}

// ── Session API ──────────────────────────────────────────

/**
 * List all active sessions.
 * @returns {Promise<{sessions, total}>}
 */
export async function listSessions() {
  return json('/api/sessions/');
}

/**
 * Create a new empty session.
 * @returns {Promise<{session_id, state, created_at}>}
 */
export async function createSession() {
  return json('/api/sessions/', { method: 'POST' });
}

/**
 * Get full session details.
 * @param {string} sessionId
 * @returns {Promise<{session_id, messages, state, message_count, created_at, updated_at}>}
 */
export async function getSession(sessionId) {
  return json(`/api/sessions/${sessionId}`);
}

/**
 * Clear all sessions.
 * @returns {Promise<{status, deleted_count}>}
 */
export async function clearAllSessions() {
  return json('/api/sessions/', { method: 'DELETE' });
}

// ── Health ───────────────────────────────────────────────

/**
 * Check backend health.
 * @returns {Promise<{status, version, active_sessions}>}
 */
export async function healthCheck() {
  return json('/health');
}

export default {
  sendMessage,
  getMessages,
  getState,
  deleteSession,
  uploadVoice,
  textToSpeech,
  listSessions,
  createSession,
  getSession,
  clearAllSessions,
  healthCheck,
};
