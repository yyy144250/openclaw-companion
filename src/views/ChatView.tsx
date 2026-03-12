import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChatMessages } from '../components/ChatMessages';
import { ChatInput } from '../components/ChatInput';
import { useAppStore } from '../stores/appStore';
import './ChatView.css';

export function ChatView() {
  const isConnected = useAppStore((state) => state.isConnected);

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
    </div>
  );
}
