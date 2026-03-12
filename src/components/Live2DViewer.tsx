import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { useAppStore } from '../stores/appStore';
import './Live2DViewer.css';

// 将 PIXI 注册到 window 以供 pixi-live2d-display 使用
(window as any).PIXI = PIXI;

interface Live2DViewerProps {
  modelPath?: string;
}

export function Live2DViewer({ modelPath = '/models/miku.model3.json' }: Live2DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const live2dAction = useAppStore((state) => state.live2dAction);

  // 加载模型
  const loadModel = useCallback(async () => {
    if (!appRef.current || !containerRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const model = await Live2DModel.from(modelPath);

      const viewWidth = containerRef.current.clientWidth || 350;
      const viewHeight = containerRef.current.clientHeight || 400;

      const scale = Math.min(
        viewWidth / model.width,
        viewHeight / model.height
      ) * 0.9;

      model.scale.set(scale);
      model.x = (viewWidth - model.width * scale) / 2;
      model.y = (viewHeight - model.height * scale) / 2;

      appRef.current.stage.addChild(model);
      modelRef.current = model;

      // 启用交互
      model.interactive = true;

      setLoading(false);
    } catch (e) {
      console.error('Failed to load model:', e);
      setError(`模型加载失败`);
      setLoading(false);
    }
  }, [modelPath]);

  // 初始化 PIXI
  useEffect(() => {
    if (!containerRef.current) return;

    const initApp = async () => {
      try {
        const app = new PIXI.Application({
          width: containerRef.current?.clientWidth || 350,
          height: containerRef.current?.clientHeight || 400,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        appRef.current = app;

        if (containerRef.current) {
          containerRef.current.appendChild(app.view as HTMLCanvasElement);
        }

        await loadModel();
      } catch (e) {
        console.error('Failed to initialize:', e);
        setError(String(e));
      }
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        modelRef.current = null;
      }
    };
  }, [loadModel]);

  // 响应 Live2D 动作
  useEffect(() => {
    if (!modelRef.current || !live2dAction) return;

    const model = modelRef.current;

    if (live2dAction.motion && model.internalModel?.motionManager) {
      model.internalModel.motionManager.startMotion(live2dAction.motion, 0);
    }

    if (live2dAction.expression && model.internalModel?.motionManager?.expressionManager) {
      model.internalModel.motionManager.expressionManager.setExpression(live2dAction.expression);
    }
  }, [live2dAction]);

  return (
    <div className="live2d-viewer" ref={containerRef}>
      {loading && (
        <div className="live2d-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
      {error && (
        <div className="live2d-error">
          <span>{error}</span>
          <button onClick={() => { setError(null); loadModel(); }}>重试</button>
        </div>
      )}
    </div>
  );
}
