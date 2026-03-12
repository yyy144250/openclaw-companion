import { useEffect, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { MascotView } from './views/MascotView';
import { ChatView } from './views/ChatView';
import { SetupWizard } from './components/SetupWizard';
import { useAppStore } from './stores/appStore';
import { wsService } from './services/websocket';
import { getHttpUrl } from './stores/appStore';
import './App.css';

function App() {
  const [windowLabel, setWindowLabel] = useState<string>('mascot');
  const addMessage = useAppStore((state) => state.addMessage);
  const setLive2DAction = useAppStore((state) => state.setLive2DAction);
  const setIsPlaying = useAppStore((state) => state.setIsPlaying);
  const settings = useAppStore((state) => state.settings);

  // 检测当前窗口类型
  useEffect(() => {
    try {
      const win = getCurrentWebviewWindow();
      setWindowLabel(win.label);
    } catch {
      setWindowLabel('mascot');
    }
  }, []);

  // 初始化 WebSocket 连接（只在 mascot 窗口中初始化）
  useEffect(() => {
    if (windowLabel !== 'mascot') return;

    const unsub = useAppStore.persist.onFinishHydration((state) => {
      if (state.settings.autoConnect && state.settings.setupComplete) {
        wsService.connectWithConfig(state.settings.server);
      }
    });

    if (useAppStore.persist.hasHydrated()) {
      const s = useAppStore.getState().settings;
      if (s.autoConnect && s.setupComplete) {
        wsService.connectWithConfig(s.server);
      }
    }

    // 注册消息处理器
    wsService.on('chat_response', (payload) => {
      addMessage({
        id: payload.id || `msg_${Date.now()}`,
        text: payload.text,
        sender: 'assistant',
        timestamp: Date.now(),
        ttsUrl: payload.tts_url,
      });

      if (payload.live2d_action || payload.live2d_expression) {
        setLive2DAction({
          motion: payload.live2d_action,
          expression: payload.live2d_expression,
        });
      }

      // 播放 TTS
      if (payload.tts_url) {
        const httpBase = getHttpUrl(useAppStore.getState().settings.server);
        const audioUrl = payload.tts_url.startsWith('http')
          ? payload.tts_url
          : `${httpBase}${payload.tts_url}`;

        setIsPlaying(true);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audio.play().catch(() => setIsPlaying(false));
      }
    });

    wsService.on('live2d_action', (payload) => {
      setLive2DAction(payload);
    });

    return () => {
      unsub();
      wsService.disconnect();
    };
  }, [windowLabel]);

  // 看板娘窗口
  if (windowLabel === 'mascot') {
    // 首次设置向导
    if (!settings.setupComplete) {
      return <SetupWizard />;
    }
    return <MascotView />;
  }

  // 聊天窗口
  return <ChatView />;
}

export default App;
