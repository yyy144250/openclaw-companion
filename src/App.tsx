import { useState, useEffect } from 'react';
import { Live2DViewer } from './components/Live2DViewer';
import { ChatInput } from './components/ChatInput';
import { ChatMessages } from './components/ChatMessages';
import { SettingsPanel } from './components/SettingsPanel';
import { useAppStore } from './stores/appStore';
import { wsService } from './services/websocket';
import './App.css';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const isConnected = useAppStore((state) => state.isConnected);
  const settings = useAppStore((state) => state.settings);
  const addMessage = useAppStore((state) => state.addMessage);
  const setLive2DAction = useAppStore((state) => state.setLive2DAction);
  const setIsPlaying = useAppStore((state) => state.setIsPlaying);

  // 初始化WebSocket连接
  useEffect(() => {
    if (settings.autoConnect && settings.serverUrl) {
      wsService.connect(settings.serverUrl, settings.token);
    }

    // 注册消息处理器
    wsService.on('chat_response', (payload) => {
      // 添加助手消息
      addMessage({
        id: payload.id || `msg_${Date.now()}`,
        text: payload.text,
        sender: 'assistant',
        timestamp: Date.now(),
        ttsUrl: payload.tts_url,
      });

      // 设置Live2D动作
      if (payload.live2d_action || payload.live2d_expression) {
        setLive2DAction({
          motion: payload.live2d_action,
          expression: payload.live2d_expression,
        });
      }

      // 播放TTS
      if (payload.tts_url) {
        setIsPlaying(true);
        const audio = new Audio(payload.tts_url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      }
    });

    wsService.on('live2d_action', (payload) => {
      setLive2DAction(payload);
    });

    return () => {
      wsService.disconnect();
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className={`connection-indicator ${isConnected ? 'connected' : ''}`}></span>
          <span className="app-title">OpenClaw Companion</span>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </header>

      <main className="app-main">
        <div className="live2d-container">
          <Live2DViewer modelPath="/models/miku.model3.json" />
        </div>
        
        <div className="chat-container">
          <ChatMessages />
          <ChatInput />
        </div>
      </main>

      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}

export default App;
