import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { wsService, probeServer } from '../services/websocket';
import './SetupWizard.css';

type Step = 'welcome' | 'connect' | 'done';

export function SetupWizard() {
  const [step, setStep] = useState<Step>('welcome');
  const [host, setHost] = useState('8.129.86.214');
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState('');
  const [probeResult, setProbeResult] = useState<{ port: number; secure: boolean } | null>(null);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const updateServerConfig = useAppStore((state) => state.updateServerConfig);

  const handleProbe = async () => {
    if (!host.trim()) return;

    setProbing(true);
    setError('');
    setProbeResult(null);

    try {
      // 检查是否包含端口号
      let targetHost = host.trim();
      let explicitPort: number | null = null;

      const portMatch = targetHost.match(/^(.+):(\d+)$/);
      if (portMatch) {
        targetHost = portMatch[1];
        explicitPort = parseInt(portMatch[2]);
      }

      if (explicitPort) {
        // 用户指定了端口，直接测试
        const protocol = explicitPort === 443 ? 'https' : 'http';
        try {
          const resp = await fetch(`${protocol}://${targetHost}:${explicitPort}/health`, {
            signal: AbortSignal.timeout(5000),
          });
          if (resp.ok) {
            setProbeResult({ port: explicitPort, secure: protocol === 'https' });
          } else {
            setError('服务器响应异常，请检查地址');
          }
        } catch {
          setError(`无法连接到 ${targetHost}:${explicitPort}，请检查地址和端口`);
        }
      } else {
        // 自动探测
        const result = await probeServer(targetHost);
        if (result.reachable) {
          setProbeResult({ port: result.port, secure: result.secure });
        } else {
          setError('无法探测到服务器，请检查地址或手动指定端口（如 myserver.com:443）');
        }
      }
    } catch (e) {
      setError('探测失败：' + String(e));
    }

    setProbing(false);
  };

  const handleConnect = () => {
    if (!probeResult) return;

    const targetHost = host.trim().replace(/:\d+$/, '');
    const config = {
      host: targetHost,
      port: probeResult.port,
      secure: probeResult.secure,
      token: '',
    };

    updateServerConfig(config);
    updateSettings({ setupComplete: true, autoConnect: true });
    wsService.connectWithConfig(config);
    setStep('done');
  };

  const handleSkip = () => {
    updateSettings({ setupComplete: true, autoConnect: false });
  };

  return (
    <div className="setup-wizard">
      <div className="setup-card">
        {step === 'welcome' && (
          <div className="setup-step">
            <div className="setup-icon">🌸</div>
            <h1>欢迎使用 Madoka</h1>
            <p className="setup-desc">
              你的桌面 AI 伴侣。<br />
              让我们先连接到你的 OpenClaw 服务器。
            </p>
            <div className="setup-actions">
              <button className="btn-primary" onClick={() => setStep('connect')}>
                开始配置
              </button>
              <button className="btn-ghost" onClick={handleSkip}>
                稍后设置
              </button>
            </div>
          </div>
        )}

        {step === 'connect' && (
          <div className="setup-step">
            <h2>连接服务器</h2>
            <p className="setup-desc">
              输入你的服务器地址，Madoka 会自动探测连接方式。
            </p>

            <div className="setup-form">
              <div className="input-group">
                <label>服务器地址</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => { setHost(e.target.value); setError(''); setProbeResult(null); }}
                  placeholder="IP 或域名，如 myserver.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleProbe()}
                />
                <span className="input-hint">支持 IP、域名，可附加端口如 myserver.com:8765</span>
              </div>

              {error && <div className="probe-error">{error}</div>}

              {probeResult && (
                <div className="probe-success">
                  ✅ 服务器已找到！端口 {probeResult.port}
                  {probeResult.secure ? '（安全连接）' : ''}
                </div>
              )}

              <div className="setup-actions">
                {!probeResult ? (
                  <button
                    className="btn-primary"
                    onClick={handleProbe}
                    disabled={probing || !host.trim()}
                  >
                    {probing ? (
                      <><span className="spinner" /> 探测中...</>
                    ) : (
                      '探测服务器'
                    )}
                  </button>
                ) : (
                  <button className="btn-primary" onClick={handleConnect}>
                    🚀 连接
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setStep('welcome')}>
                  返回
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="setup-step">
            <div className="setup-icon">🎉</div>
            <h2>连接成功！</h2>
            <p className="setup-desc">
              点击看板娘即可开始聊天~<br />
              右键看板娘可以打开更多选项。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
