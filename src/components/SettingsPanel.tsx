import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { wsService, probeServer } from '../services/websocket';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const updateServerConfig = useAppStore((state) => state.updateServerConfig);
  const isConnected = useAppStore((state) => state.isConnected);

  const [host, setHost] = useState(settings.server.host);
  const [port, setPort] = useState(String(settings.server.port));
  const [probing, setProbing] = useState(false);
  const [probeMsg, setProbeMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHost(settings.server.host);
      setPort(String(settings.server.port));
    }
  }, [isOpen, settings]);

  const handleProbeAndConnect = async () => {
    setProbing(true);
    setProbeMsg('');

    const targetHost = host.trim();
    if (!targetHost) { setProbing(false); return; }

    // 如果指定了端口则直接连
    const p = parseInt(port);
    if (p) {
      const config = { host: targetHost, port: p, secure: false, token: settings.server.token };
      updateServerConfig(config);
      wsService.connectWithConfig(config);
      setProbeMsg('正在连接...');
      setProbing(false);
      return;
    }

    // 自动探测
    const result = await probeServer(targetHost);
    if (result.reachable) {
      const config = { host: targetHost, port: result.port, secure: result.secure, token: settings.server.token };
      updateServerConfig(config);
      wsService.connectWithConfig(config);
      setProbeMsg(`✅ 已找到服务器 (端口 ${result.port})`);
    } else {
      setProbeMsg('❌ 无法连接到服务器');
    }
    setProbing(false);
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
          {/* 连接设置 */}
          <section className="settings-section">
            <h3>🌐 服务器连接</h3>
            <div className="form-group">
              <label>服务器地址</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="IP 或域名"
              />
            </div>
            <div className="form-group">
              <label>端口</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="443"
              />
            </div>
            {probeMsg && <div className="probe-msg">{probeMsg}</div>}
            <div className="connection-actions">
              <span className={`status-indicator ${isConnected ? 'online' : ''}`}>
                {isConnected ? '● 已连接' : '○ 未连接'}
              </span>
              {isConnected ? (
                <button className="btn-danger" onClick={handleDisconnect}>断开</button>
              ) : (
                <button className="btn-primary-sm" onClick={handleProbeAndConnect} disabled={probing}>
                  {probing ? '探测中...' : '连接'}
                </button>
              )}
            </div>
          </section>

          {/* 语音设置 */}
          <section className="settings-section">
            <h3>🔊 语音设置</h3>
            <div className="form-group">
              <label>TTS 音色</label>
              <select
                value={settings.ttsVoice}
                onChange={(e) => updateSettings({ ttsVoice: e.target.value })}
              >
                <option value="zh-CN-XiaoxiaoNeural">晓晓 (女声)</option>
                <option value="zh-CN-YunxiNeural">云希 (男声)</option>
                <option value="zh-CN-YunyangNeural">云扬 (男声)</option>
              </select>
            </div>
          </section>

          {/* 显示设置 */}
          <section className="settings-section">
            <h3>🎨 显示</h3>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoConnect}
                  onChange={(e) => updateSettings({ autoConnect: e.target.checked })}
                />
                启动时自动连接
              </label>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button className="btn-ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
