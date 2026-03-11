import { useState, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { wsService } from '../services/websocket';
import './ChatInput.css';

export function ChatInput() {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isConnected = useAppStore((state) => state.isConnected);
  const addMessage = useAppStore((state) => state.addMessage);
  const setLive2DAction = useAppStore((state) => state.setLive2DAction);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !isConnected) return;

    // 添加用户消息
    const userMessage = {
      id: `msg_${Date.now()}`,
      text: text.trim(),
      sender: 'user' as const,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    // 发送消息到服务器
    wsService.sendChat(text.trim(), 'text');
    
    // 设置看板娘动作
    setLive2DAction({ motion: 'thinking' });

    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isConnected ? "发送消息..." : "未连接服务器"}
        disabled={!isConnected}
      />
      <button 
        type="submit" 
        disabled={!text.trim() || !isConnected}
        className="send-btn"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </form>
  );
}
