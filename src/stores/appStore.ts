import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, Live2DAction, AppSettings, WindowMode } from '../types';

interface AppState {
  // Window
  windowMode: WindowMode;
  setWindowMode: (mode: WindowMode) => void;

  // Connection
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // Live2D
  live2dAction: Live2DAction | null;
  setLive2DAction: (action: Live2DAction | null) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateServerConfig: (config: Partial<AppSettings['server']>) => void;

  // Audio
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  server: {
    host: '8.129.86.214',
    port: 443,
    secure: false,
    token: '',
  },
  alwaysOnTop: true,
  opacity: 1,
  ttsVoice: 'zh-CN-XiaoxiaoNeural',
  autoConnect: true,
  setupComplete: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Window
      windowMode: 'mascot',
      setWindowMode: (mode) => set({ windowMode: mode }),

      // Connection
      isConnected: false,
      connect: () => set({ isConnected: true }),
      disconnect: () => set({ isConnected: false }),

      // Chat
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearMessages: () => set({ messages: [] }),

      // Live2D
      live2dAction: null,
      setLive2DAction: (action) => set({ live2dAction: action }),

      // Settings
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      updateServerConfig: (config) =>
        set((state) => ({
          settings: {
            ...state.settings,
            server: { ...state.settings.server, ...config },
          },
        })),

      // Audio
      isPlaying: false,
      setIsPlaying: (playing) => set({ isPlaying: playing }),
    }),
    {
      name: 'madoka-storage',
      version: 4,
      partialize: (state) => ({ settings: state.settings }),
      migrate: (persistedState: any, version: number) => {
        if (version < 4) {
          // 从旧版本迁移：清除旧格式
          return { settings: DEFAULT_SETTINGS };
        }
        return persistedState;
      },
    }
  )
);

// ===== 辅助函数 =====

/** 根据 ServerConfig 生成 WebSocket URL */
export function getWsUrl(server: AppSettings['server']): string {
  const protocol = server.secure ? 'wss' : 'ws';
  return `${protocol}://${server.host}:${server.port}`;
}

/** 根据 ServerConfig 生成 HTTP URL */
export function getHttpUrl(server: AppSettings['server']): string {
  const protocol = server.secure ? 'https' : 'http';
  return `${protocol}://${server.host}:${server.port}`;
}
