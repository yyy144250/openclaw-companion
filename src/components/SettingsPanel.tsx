import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { wsService } from '../services/websocket';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const isConnected = useAppStore((state) => state.isConnected);
  const [tempSettings, setTempSettings] = useState(settings);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    updateSettings(tempSettings);
    onClose();
  };

  const handleConnect = () => {
    // 先保存设置，再连接，确保地址被持久化
    updateSettings(tempSettings);
    wsService.connect(tempSettings.serverUrl, tempSettings.token);
  };

  const handleDisconnect = () => {
    wsService.disconnect();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>连接设置</h3>
            <div className="form-group">
              <label>服务器地址</label>
              <input
                type="text"
                value={tempSettings.serverUrl}
                onChange={(e) => setTempSettings({ ...tempSettings, serverUrl: e.target.value })}
                placeholder="ws://localhost:8765"
              />
            </div>
            <div className="form-group">
              <label>认证Token</label>
              <input
                type="password"
                value={tempSettings.token}
                onChange={(e) => setTempSettings({ ...tempSettings, token: e.target.value })}
                placeholder="输入Token"
              />
            </div>
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
              <span>{isConnected ? '已连接' : '未连接'}</span>
              {isConnected ? (
                <button onClick={handleDisconnect}>断开</button>
              ) : (
                <button onClick={handleConnect}>连接</button>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h3>显示设置</h3>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={tempSettings.alwaysOnTop}
                  onChange={(e) => setTempSettings({ ...tempSettings, alwaysOnTop: e.target.checked })}
                />
                窗口置顶
              </label>
            </div>
            <div className="form-group">
              <label>透明度: {Math.round(tempSettings.opacity * 100)}%</label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={tempSettings.opacity}
                onChange={(e) => setTempSettings({ ...tempSettings, opacity: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>语音设置</h3>
            <div className="form-group">
              <label>TTS音色</label>
              <select
                value={tempSettings.ttsVoice}
                onChange={(e) => setTempSettings({ ...tempSettings, ttsVoice: e.target.value })}
              >
                <option value="zh-CN-XiaoxiaoNeural">晓晓 (女声)</option>
                <option value="zh-CN-YunxiNeural">云希 (男声)</option>
                <option value="zh-CN-YunyangNeural">云扬 (男声)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button className="save-btn" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
