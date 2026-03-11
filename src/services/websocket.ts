import { ClientMessage, ServerMessage } from '../types';
import { useAppStore } from '../stores/appStore';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();

  connect(serverUrl: string, token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket(serverUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
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

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        useAppStore.getState().disconnect();
        this.scheduleReconnect(serverUrl, token);
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
