import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, Live2DAction, AppSettings } from '../types';

interface AppState {
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
  
  // Audio
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Connection
      isConnected: false,
      connect: () => set({ isConnected: true }),
      disconnect: () => set({ isConnected: false }),
      
      // Chat
      messages: [],
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      clearMessages: () => set({ messages: [] }),
      
      // Live2D
      live2dAction: null,
      setLive2DAction: (action) => set({ live2dAction: action }),
      
      // Settings
      settings: {
        serverUrl: 'ws://8.129.86.214:443',
        token: '',
        alwaysOnTop: false,
        opacity: 1,
        ttsVoice: 'zh-CN-XiaoxiaoNeural',
        autoConnect: false,
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      // Audio
      isPlaying: false,
      setIsPlaying: (playing) => set({ isPlaying: playing }),
    }),
    {
      name: 'madoka-storage',
      version: 3,
      partialize: (state) => ({ settings: state.settings }),
      migrate: (persistedState: any, version: number) => {
        if (version < 3) {
          return {
            ...persistedState,
            settings: {
              ...(persistedState as any)?.settings,
              serverUrl: 'ws://8.129.86.214:443',
              autoConnect: false,
            },
          };
        }
        return persistedState;
      },
    }
  )
);
