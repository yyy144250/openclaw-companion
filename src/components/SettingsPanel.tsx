import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { wsService } from '../services/websocket';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// LLM 配置接口
interface LLMConfig {
  baseUrl: string;
  model: string;
  hasToken: boolean;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const isConnected = useAppStore((state) => state.isConnected);
  const [tempSettings, setTempSettings] = useState(settings);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [llmToken, setLlmToken] = useState('');
  const [savingLlm, setSavingLlm] = useState(false);

  // 加载 LLM 配置
  useEffect(() => {
    if (isOpen && settings.serverUrl) {
      fetch(`${settings.serverUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/config`)
        .then(res => res.json())
        .then(data => setLlmConfig(data))
        .catch(err => console.error('Failed to load LLM config:', err));
    }
  }, [isOpen, settings.serverUrl]);

  // 保存 LLM 配置
  const handleSaveLlmConfig = async () => {
    if (!llmConfig || !settings.serverUrl) return;
    
    setSavingLlm(true);
    try {
      const baseUrl = llmConfig.baseUrl.replace('/v1', '');
      const res = await fetch(`${settings.serverUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: `${baseUrl}/v1`,
          token: llmToken,
          model: llmConfig.model
        })
      });
      if (res.ok) {
        alert('LLM 配置已保存');
      } else {
        alert('保存失败');
      }
    } catch (err) {
      alert('保存失败: ' + err);
    }
    setSavingLlm(false);
  };

  useEffect(() => {
    setTempSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    updateSettings(tempSettings);
    onClose();
  };

  const handleConnect = () => {
    const url = tempSettings.serverUrl.trim();
    console.log('handleConnect called, url:', url);
    // 先保存设置，再连接，确保地址被持久化
    updateSettings({ ...tempSettings, serverUrl: url });
    wsService.connect(url, tempSettings.token);
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

          {/* LLM 配置 */}
          <div className="settings-section">
            <h3>LLM 配置</h3>
            {llmConfig ? (
              <>
                <div className="form-group">
                  <label>API 地址</label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl}
                    onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                    placeholder="http://127.0.0.1:18789/v1"
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    placeholder="openclaw:nishuo"
                  />
                </div>
                <div className="form-group">
                  <label>Token {llmConfig.hasToken && '(已配置)'}</label>
                  <input
                    type="password"
                    value={llmToken}
                    onChange={(e) => setLlmToken(e.target.value)}
                    placeholder={llmConfig.hasToken ? '留空保持不变' : '输入 Token'}
                  />
                </div>
                <button onClick={handleSaveLlmConfig} disabled={savingLlm}>
                  {savingLlm ? '保存中...' : '保存 LLM 配置'}
                </button>
              </>
            ) : (
              <p>加载中...</p>
            )}
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
