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
      console.log('Loading model from:', modelPath);

      const model = await Live2DModel.from(modelPath);

      // 设置模型大小和位置
      const viewWidth = containerRef.current.clientWidth || 400;
      const viewHeight = containerRef.current.clientHeight || 500;

      // 自适应大小
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
      model.on('pointerdown', () => {
        console.log('Model clicked!');
        if (model.internalModel?.motionManager) {
          model.internalModel.motionManager.startMotion('tap_body', 0);
        }
      });

      setLoading(false);
    } catch (e) {
      console.error('Failed to load model:', e);
      setError(`Failed to load model: ${e}`);
      setLoading(false);
    }
  }, [modelPath]);

  // 初始化 PIXI 和 Live2D
  useEffect(() => {
    if (!containerRef.current) return;

    const initApp = async () => {
      try {
        const app = new PIXI.Application({
          width: containerRef.current?.clientWidth || 400,
          height: containerRef.current?.clientHeight || 500,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        appRef.current = app;

        if (containerRef.current) {
          containerRef.current.appendChild(app.view as HTMLCanvasElement);
        }

        // 加载 Live2D 模型
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

    // 播放动作
    if (live2dAction.motion && model.internalModel?.motionManager) {
      model.internalModel.motionManager.startMotion(live2dAction.motion, 0);
    }

    // 设置表情
    if (live2dAction.expression && model.internalModel?.motionManager?.expressionManager) {
      model.internalModel.motionManager.expressionManager.setExpression(live2dAction.expression);
    }

    // 目光追踪
    if (live2dAction.tracking === 'mouse' && containerRef.current) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current || !model.internalModel) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        // 设置目光方向
        if (model.internalModel.core) {
          const paramAngleX = model.internalModel.core.Parameters.find(
            (p: { Name: string }) => p.Name === 'ParamAngleX'
          );
          const paramAngleY = model.internalModel.core.Parameters.find(
            (p: { Name: string }) => p.Name === 'ParamAngleY'
          );
          
          if (paramAngleX) {
            model.internalModel.core.setParameterValueById(
              paramAngleX.Id,
              (x - 0.5) * 30
            );
          }
          if (paramAngleY) {
            model.internalModel.core.setParameterValueById(
              paramAngleY.Id,
              (y - 0.5) * 30
            );
          }
        }
      };

      containerRef.current.addEventListener('mousemove', handleMouseMove);
      return () => {
        containerRef.current?.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [live2dAction]);

  return (
    <div className="live2d-viewer" ref={containerRef}>
      {loading && (
        <div className="live2d-loading">
          <div className="loading-spinner"></div>
          <span>加载模型中...</span>
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
