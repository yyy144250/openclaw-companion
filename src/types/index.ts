// 消息类型定义
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

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  ttsUrl?: string;
}

export interface Live2DAction {
  action?: string;
  motion?: string;
  expression?: string;
  tracking?: 'mouse' | 'none';
}

export interface ConnectionConfig {
  serverUrl: string;
  token: string;
}

export interface AppSettings {
  serverUrl: string;
  token: string;
  alwaysOnTop: boolean;
  opacity: number;
  ttsVoice: string;
  autoConnect: boolean;
}
