import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChatMessages } from '../components/ChatMessages';
import { ChatInput } from '../components/ChatInput';
import { SettingsPanel } from '../components/SettingsPanel';
import { useAppStore } from '../stores/appStore';
import './ChatView.css';

export function ChatView() {
  const isConnected = useAppStore((state) => state.isConnected);
  const [showSettings, setShowSettings] = useState(false);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      invoke('start_dragging', { label: 'chat' }).catch(console.error);
    }
  }, []);

  const handleClose = useCallback(() => {
    invoke('close_chat_window').catch(console.error);
  }, []);

  return (
    <div className="chat-view">
      {/* 自定义标题栏 */}
      <div className="chat-titlebar" onMouseDown={handleDrag}>
        <div className="titlebar-left">
          <div className={`title-status ${isConnected ? 'online' : ''}`} />
          <span className="title-text">Madoka</span>
          <span className="title-subtitle">
            {isConnected ? '在线' : '离线'}
          </span>
        </div>
        <div className="titlebar-actions">
          <button className="titlebar-btn settings-btn" onClick={() => setShowSettings(true)} title="设置">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <button className="titlebar-btn close-btn" onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 聊天主体 */}
      <div className="chat-body">
        <ChatMessages />
      </div>

      {/* 输入区域 */}
      <div className="chat-footer">
        <ChatInput />
      </div>

      {/* 设置面板 */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
