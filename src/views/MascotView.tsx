import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Live2DViewer } from '../components/Live2DViewer';
import { useAppStore } from '../stores/appStore';
import './MascotView.css';

export function MascotView() {
  const isConnected = useAppStore((state) => state.isConnected);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleClick = useCallback(() => {
    invoke('toggle_chat_window').catch(console.error);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      invoke('start_dragging', { label: 'mascot' }).catch(console.error);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleQuit = useCallback(async () => {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const win = getCurrentWebviewWindow();
      await win.destroy();
    } catch {
      window.close();
    }
  }, []);

  return (
    <div
      className="mascot-view"
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (showMenu) setShowMenu(false);
      }}
    >
      {/* 状态指示器 */}
      <div className="mascot-status">
        <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
        {isPlaying && <div className="speaking-indicator">🔊</div>}
      </div>

      {/* Live2D 看板娘 */}
      <div className="mascot-canvas" onClick={handleClick}>
        <Live2DViewer modelPath="/models/miku/assets/xuefeng_3/xuefeng_3.model3.json" />
      </div>

      {/* 右键菜单 */}
      {showMenu && (
        <div
          className="context-menu"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button onClick={() => { invoke('toggle_chat_window'); setShowMenu(false); }}>
            💬 打开聊天
          </button>
          <button onClick={() => { setShowMenu(false); /* TODO: settings */ }}>
            ⚙️ 设置
          </button>
          <div className="menu-divider" />
          <button onClick={handleQuit}>
            ❌ 退出
          </button>
        </div>
      )}
    </div>
  );
}
