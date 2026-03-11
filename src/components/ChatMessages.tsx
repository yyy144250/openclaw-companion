import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import './ChatMessages.css';

export function ChatMessages() {
  const messages = useAppStore((state) => state.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="chat-messages empty">
        <div className="empty-hint">
          <span>✨ 发送消息开始对话</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`message ${msg.sender === 'user' ? 'user' : 'assistant'}`}
        >
          <div className="message-bubble">
            {msg.text}
            {msg.ttsUrl && (
              <button 
                className="play-tts"
                onClick={() => {
                  const audio = new Audio(msg.ttsUrl);
                  audio.play();
                }}
              >
                🔊
              </button>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
