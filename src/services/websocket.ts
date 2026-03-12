import { ClientMessage, ServerMessage } from '../types';
import { useAppStore } from '../stores/appStore';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private connectTimer: number | null = null;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
  private intentionalClose = false;

  connect(serverUrl: string, token: string) {
    console.log('[WS] connect() called with:', serverUrl);
    
    // 如果已有连接，先清理
    if (this.ws) {
      this.intentionalClose = true;
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    this.intentionalClose = false;

    try {
      console.log('Connecting to:', serverUrl);
      this.ws = new WebSocket(serverUrl);

      // 10秒连接超时
      this.connectTimer = window.setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.warn('[WS] Connection timeout after 10s');
          this.intentionalClose = true;
          this.ws.close();
          this.ws = null;
          useAppStore.getState().disconnect();
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('WebSocket connected to:', serverUrl);
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        // 发送认证
        this.send({
          type: 'system',
          payload: { action: 'auth', token },
          id: `auth_${Date.now()}`,
          timestamp: Date.now()
        });
        useAppStore.getState().connect();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        useAppStore.getState().disconnect();
        if (!this.intentionalClose) {
          this.scheduleReconnect(serverUrl, token);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }

  private scheduleReconnect(serverUrl: string, token: string) {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(serverUrl, token);
    }, 5000);
  }

  disconnect() {
    this.intentionalClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message queued:', message);
    }
  }

  sendChat(text: string, mode: 'text' | 'voice' = 'text') {
    const id = `msg_${Date.now()}`;
    this.send({
      type: 'chat',
      payload: { message: text, mode },
      id,
      timestamp: Date.now()
    });
    return id;
  }

  on(type: string, handler: (payload: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  off(type: string) {
    this.messageHandlers.delete(type);
  }

  private handleMessage(message: ServerMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.payload);
    }
  }
}

export const wsService = new WebSocketService();
