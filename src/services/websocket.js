/**
 * websocket.js — Real-time WebSocket client for Pehli Awaaz.
 *
 * Manages a persistent bidirectional connection to the backend,
 * handling text/audio streaming, auto-reconnection, and event routing.
 */

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

/**
 * @typedef {Object} WSEvents
 * @property {(sessionId: string) => void}        onSession
 * @property {(step: string) => void}             onThinking
 * @property {(state: Object) => void}            onStateUpdate
 * @property {(token: string) => void}            onAIToken
 * @property {(text: string) => void}             onAIComplete
 * @property {(data: Object) => void}             onSTTResult
 * @property {(chunk: ArrayBuffer) => void}       onTTSChunk
 * @property {() => void}                         onTTSComplete
 * @property {(detail: string) => void}           onError
 * @property {() => void}                         onConnected
 * @property {() => void}                         onDisconnected
 */

class WebSocketClient {
  constructor() {
    /** @type {WebSocket|null} */
    this._ws = null;
    this._sessionId = null;
    this._events = {};
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 10;
    this._reconnectDelay = 1000;
    this._intentionalClose = false;
    this._pingInterval = null;
  }

  /**
   * Connect to the WebSocket server.
   * @param {string} sessionId
   * @param {Partial<WSEvents>} events - Event handlers
   */
  connect(sessionId, events = {}) {
    this._sessionId = sessionId;
    this._events = events;
    this._intentionalClose = false;
    this._reconnectAttempts = 0;
    this._doConnect();
  }

  _doConnect() {
    if (this._ws) {
      this._ws.close();
    }

    const url = `${WS_BASE}/ws/${this._sessionId}`;
    console.log(`[WS] Connecting to ${url}...`);

    this._ws = new WebSocket(url);
    this._ws.binaryType = 'arraybuffer';

    this._ws.onopen = () => {
      console.log('[WS] Connected');
      this._reconnectAttempts = 0;
      this._startPing();
      this._emit('onConnected');
    };

    this._ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary frame — TTS audio chunk
        this._emit('onTTSChunk', event.data);
        return;
      }

      try {
        const frame = JSON.parse(event.data);
        this._handleFrame(frame);
      } catch (e) {
        console.error('[WS] Failed to parse frame:', e);
      }
    };

    this._ws.onclose = (event) => {
      console.log(`[WS] Disconnected (code=${event.code})`);
      this._stopPing();
      this._emit('onDisconnected');

      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    };

    this._ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  /**
   * Handle incoming JSON frames from the server.
   * @param {{event: string, payload: Object}} frame
   */
  _handleFrame(frame) {
    const { event, payload } = frame;

    switch (event) {
      case 'session':
        this._sessionId = payload.session_id;
        this._emit('onSession', payload.session_id);
        break;
      case 'thinking':
        this._emit('onThinking', payload.step);
        break;
      case 'state_update':
        this._emit('onStateUpdate', payload.state);
        break;
      case 'ai_token':
        this._emit('onAIToken', payload.token);
        break;
      case 'ai_complete':
        this._emit('onAIComplete', payload.text);
        break;
      case 'stt_result':
        this._emit('onSTTResult', payload);
        break;
      case 'tts_complete':
        this._emit('onTTSComplete');
        break;
      case 'pong':
        // Keepalive acknowledged
        break;
      case 'error':
        console.error('[WS] Server error:', payload.detail);
        this._emit('onError', payload.detail);
        break;
      case 'done':
        // Pipeline complete
        break;
      default:
        console.warn('[WS] Unknown event:', event, payload);
    }
  }

  /**
   * Send a text message through the WebSocket.
   * @param {string} text
   * @param {string} language
   */
  sendText(text, language = 'hinglish') {
    this._sendJSON({
      event: 'user_text',
      payload: { text, language },
    });
  }

  /**
   * Trigger a cinematic preset scenario.
   * @param {string} scenarioId 
   */
  sendScenario(scenarioId) {
    this._sendJSON({
      event: 'start_scenario',
      payload: { scenario_id: scenarioId },
    });
  }

  /**
   * Send raw audio bytes through the WebSocket.
   * @param {ArrayBuffer|Blob} audioData
   */
  async sendAudio(audioData) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      console.error('[WS] Cannot send audio — not connected');
      return;
    }

    if (audioData instanceof Blob) {
      audioData = await audioData.arrayBuffer();
    }

    this._ws.send(audioData);
  }

  /**
   * Send end-of-audio signal (empty binary frame).
   */
  endAudio() {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(new ArrayBuffer(0));
    }
  }

  /**
   * Disconnect from the server.
   */
  disconnect() {
    this._intentionalClose = true;
    this._stopPing();
    clearTimeout(this._reconnectTimer);
    if (this._ws) {
      this._ws.close(1000, 'Client disconnect');
      this._ws = null;
    }
  }

  /**
   * Check if connected.
   * @returns {boolean}
   */
  get isConnected() {
    return this._ws?.readyState === WebSocket.OPEN;
  }

  get sessionId() {
    return this._sessionId;
  }

  // ── Private ───────────────────────────────────────────

  _sendJSON(data) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      console.error('[WS] Cannot send — not connected');
      return;
    }
    this._ws.send(JSON.stringify(data));
  }

  _emit(eventName, ...args) {
    const handler = this._events[eventName];
    if (handler) {
      try {
        handler(...args);
      } catch (e) {
        console.error(`[WS] Event handler error (${eventName}):`, e);
      }
    }
  }

  _startPing() {
    this._stopPing();
    this._pingInterval = setInterval(() => {
      this._sendJSON({ event: 'ping' });
    }, 25000);
  }

  _stopPing() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  _scheduleReconnect() {
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      this._emit('onError', 'Connection lost. Please refresh the page.');
      return;
    }

    const delay = Math.min(
      this._reconnectDelay * Math.pow(1.5, this._reconnectAttempts),
      30000,
    );
    this._reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})...`);

    this._reconnectTimer = setTimeout(() => {
      this._doConnect();
    }, delay);
  }
}

// ── Singleton ───────────────────────────────────────────

let _instance = null;

/**
 * Get the singleton WebSocket client.
 * @returns {WebSocketClient}
 */
export function getWSClient() {
  if (!_instance) {
    _instance = new WebSocketClient();
  }
  return _instance;
}

export { WebSocketClient };
export default getWSClient;
