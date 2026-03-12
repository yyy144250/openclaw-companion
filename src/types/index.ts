// ===== 消息协议 =====
export interface ClientMessage {
  type: 'chat' | 'tts' | 'stt' | 'system';
  payload: any;
  id: string;
  timestamp: number;
}

export interface ServerMessage {
  type: 'chat_response' | 'tts_audio' | 'stt_text' | 'live2d_action' | 'system_notification' | 'connection_status';
  payload: any;
  id: string;
  timestamp: number;
}

// ===== 聊天 =====
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  ttsUrl?: string;
  images?: string[];  // base64 或 URL 图片
}

// ===== Live2D =====
export interface Live2DAction {
  action?: string;
  motion?: string;
  expression?: string;
  tracking?: 'mouse' | 'none';
}

// ===== 连接配置 =====
export interface ServerConfig {
  /** 服务器地址，仅 host 或 host:port 格式，如 "8.129.86.214" 或 "myserver.com:443" */
  host: string;
  /** 连接端口（从 host 解析或自动探测） */
  port: number;
  /** 是否使用 TLS */
  secure: boolean;
  /** 认证 token */
  token: string;
}

// ===== 应用设置 =====
export interface AppSettings {
  server: ServerConfig;
  alwaysOnTop: boolean;
  opacity: number;
  ttsVoice: string;
  autoConnect: boolean;
  /** 是否已完成首次设置 */
  setupComplete: boolean;
}

// ===== 窗口类型 =====
export type WindowMode = 'mascot' | 'chat';
