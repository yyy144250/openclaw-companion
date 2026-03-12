import { ClientMessage, ServerMessage, ServerConfig } from '../types';
import { useAppStore, getWsUrl } from '../stores/appStore';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private connectTimer: number | null = null;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
  private intentionalClose = false;
  private currentConfig: ServerConfig | null = null;

  connectWithConfig(config: ServerConfig) {
    const url = getWsUrl(config);
    this.currentConfig = config;
    this.connectToUrl(url, config.token);
  }

  private connectToUrl(serverUrl: string, token: string) {
    console.log('[WS] connect() called with:', serverUrl);

    // 清理已有连接
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
        console.log('✅ WebSocket connected to:', serverUrl);
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        // 发送认证
        this.send({
          type: 'system',
          payload: { action: 'auth', token },
          id: `auth_${Date.now()}`,
          timestamp: Date.now(),
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
        console.log('WebSocket disconnected, code:', event.code);
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        useAppStore.getState().disconnect();
        if (!this.intentionalClose && this.currentConfig) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.currentConfig) return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentConfig) {
        this.connectWithConfig(this.currentConfig);
      }
    }, 5000);
  }

  disconnect() {
    this.intentionalClose = true;
    this.currentConfig = null;

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
      console.warn('WebSocket not connected');
    }
  }

  /** 发送聊天消息（支持图片） */
  sendChat(text: string, images?: string[]) {
    const id = `msg_${Date.now()}`;
    this.send({
      type: 'chat',
      payload: {
        message: text,
        images: images || [],
        mode: 'text',
      },
      id,
      timestamp: Date.now(),
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

// ===== 服务器连通性探测 =====
export async function probeServer(host: string): Promise<{
  reachable: boolean;
  port: number;
  secure: boolean;
}> {
  // 按优先级尝试常见端口
  const candidates = [
    { port: 443, secure: false },
    { port: 8765, secure: false },
    { port: 80, secure: false },
    { port: 443, secure: true },
  ];

  for (const { port, secure } of candidates) {
    const protocol = secure ? 'https' : 'http';
    const url = `${protocol}://${host}:${port}/health`;
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        return { reachable: true, port, secure };
      }
    } catch {
      // 继续尝试下一个
    }
  }

  return { reachable: false, port: 443, secure: false };
}
