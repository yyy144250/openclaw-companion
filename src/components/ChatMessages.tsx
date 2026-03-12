import { useEffect, useRef } from 'react';
import { useAppStore, getHttpUrl } from '../stores/appStore';
import './ChatMessages.css';

export function ChatMessages() {
  const messages = useAppStore((state) => state.messages);
  const settings = useAppStore((state) => state.settings);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="chat-messages empty">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>和 Madoka 聊天吧</h3>
          <p>发送文字或图片开始对话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      <div className="messages-list">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.sender}`}
          >
            {msg.sender === 'assistant' && (
              <div className="avatar assistant-avatar">🌸</div>
            )}
            <div className="message-content">
              <div className="message-bubble">
                {/* 图片列表 */}
                {msg.images && msg.images.length > 0 && (
                  <div className="message-images">
                    {msg.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="message-image"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}
                {/* 文本内容 */}
                {msg.text && <div className="message-text">{msg.text}</div>}
              </div>
              {/* TTS 播放按钮 */}
              {msg.ttsUrl && (
                <button
                  className="tts-play-btn"
                  onClick={() => {
                    const httpBase = getHttpUrl(settings.server);
                    const url = msg.ttsUrl!.startsWith('http')
                      ? msg.ttsUrl!
                      : `${httpBase}${msg.ttsUrl}`;
                    const audio = new Audio(url);
                    audio.play().catch(console.error);
                  }}
                >
                  🔊
                </button>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="avatar user-avatar">👤</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
