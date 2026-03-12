import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { wsService } from '../services/websocket';
import './ChatInput.css';

export function ChatInput() {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnected = useAppStore((state) => state.isConnected);
  const addMessage = useAppStore((state) => state.addMessage);
  const setLive2DAction = useAppStore((state) => state.setLive2DAction);

  // 将文件转为 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 添加图片
  const addImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const base64Images = await Promise.all(imageFiles.map(fileToBase64));
    setImages((prev) => [...prev, ...base64Images].slice(0, 4)); // 最多 4 张
  }, []);

  // 移除图片
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 处理粘贴
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));

      if (imageItems.length > 0) {
        e.preventDefault();
        const files = imageItems
          .map((item) => item.getAsFile())
          .filter(Boolean) as File[];
        await addImages(files);
      }
    },
    [addImages]
  );

  // 处理拖拽
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      await addImages(files);
    },
    [addImages]
  );

  // 发送消息
  const handleSubmit = () => {
    if ((!text.trim() && images.length === 0) || !isConnected) return;

    const userMessage = {
      id: `msg_${Date.now()}`,
      text: text.trim(),
      sender: 'user' as const,
      timestamp: Date.now(),
      images: images.length > 0 ? [...images] : undefined,
    };
    addMessage(userMessage);

    // 发送到服务器
    wsService.sendChat(text.trim(), images.length > 0 ? images : undefined);

    // 设置看板娘动作
    setLive2DAction({ motion: 'thinking' });

    setText('');
    setImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="chat-input-wrapper"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 图片预览 */}
      {images.length > 0 && (
        <div className="image-preview-bar">
          {images.map((img, i) => (
            <div key={i} className="image-preview-item">
              <img src={img} alt="" />
              <button className="remove-image" onClick={() => removeImage(i)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="input-row">
        {/* 添加图片按钮 */}
        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConnected}
          title="发送图片"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M3 16l5-5 4 4 3-3 6 6v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-3z" fill="currentColor" opacity="0.3" />
          </svg>
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isConnected ? '发送消息...   Ctrl+V 粘贴图片' : '未连接到服务器'}
          disabled={!isConnected}
          rows={1}
        />

        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={(!text.trim() && images.length === 0) || !isConnected}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) {
            addImages(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
