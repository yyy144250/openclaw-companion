# OpenClaw Live2D Desktop Companion - 技术规格文档

## 1. 项目概述

### 项目名称
**OpenClaw Companion** (拟蓑白桌面伴侣)

### 项目目标
开发一款跨平台桌面应用（Windows/macOS），以Live2D虚拟形象作为交互界面，连接云端OpenClaw服务，实现AI对话、语音交互、桌面提醒等功能。

### 核心特性
- Live2D虚拟形象实时渲染与动画响应
- 云端AI对话（通过OpenClaw Gateway）
- 语音合成(TTS)与语音识别(STT)
- 系统监控与桌面提醒
- 轻量级（~20MB安装包）

---

## 2. 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           用户桌面                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Tauri Desktop App                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │   │
│  │  │  Live2D   │  │   TTS     │  │   STT     │  │  System   │  │   │
│  │  │  Renderer │  │  Player   │  │  Recorder │  │  Monitor  │  │   │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  │   │
│  │        └──────────────┼──────────────┴──────────────┘        │   │
│  │                       ▼                                        │   │
│  │              ┌─────────────────┐                               │   │
│  │              │  Cloud Connector │  (WebSocket/HTTP)          │   │
│  │              └────────┬────────┘                               │   │
│  └───────────────────────┼───────────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                    [Internet/WAN]
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                    云端服务器                                         │
│  ┌───────────────────────▼───────────────────────────────────────┐  │
│  │              OpenClaw Gateway (已有)                           │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │  │
│  │  │  Chat     │  │  Skills   │  │  TTS      │  │  STT      │   │  │
│  │  │  (LLM)    │  │ (天气/日程)│  │ (EdgeTTS) │  │ (Whisper) │   │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ▲                                       │
│                              │                                       │
│                    用户通过 Feishu/Telegram/Discord 连接             │
└──────────────────────────────────────────────────────────────────────┘
```

### 技术栈选型

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 桌面框架 | **Tauri 2.x** | 体积小(~10MB)、性能好、跨平台 |
| 前端框架 | **React + TypeScript** | 生态丰富、组件化开发 |
| Live2D渲染 | **pixi-live2d-display** | 支持所有Live2D模型、社区活跃 |
| 状态管理 | **Zustand** | 轻量、简单 |
| 云端通信 | **WebSocket (ws)** | 实时双向、低延迟 |
| 语音合成 | **Edge-TTS** | 免费、低延迟、云端处理 |
| 语音识别 | **Whisper API** | 准确、云端处理 |

---

## 3. 通信协议

### 3.1 WebSocket消息格式

```typescript
// 客户端 → 云端
interface ClientMessage {
  type: 'chat' | 'tts' | 'stt' | 'system';
  payload: any;
  id: string;  // 消息ID，用于追踪
  timestamp: number;
}

// 云端 → 客户端
interface ServerMessage {
  type: 'chat_response' | 'tts_audio' | 'stt_text' | 'live2d_action' | 'system_notification';
  payload: any;
  id: string;  // 对应请求ID
  timestamp: number;
}
```

### 3.2 消息类型详解

#### 对话消息
```typescript
// Client: 发送聊天
{
  type: 'chat',
  payload: {
    message: '今天天气怎么样？',
    mode: 'voice' // 'text' | 'voice'
  },
  id: 'msg_001',
  timestamp: 1700000000000
}

// Server: 响应
{
  type: 'chat_response',
  payload: {
    text: '今天深圳天气晴朗，气温22-28°C，适合出门~',
    tts_url: 'https://cdn.example.com/tts/msg_001.mp3',
    live2d_action: 'happy',
    live2d_expression: 'smile'
  },
  id: 'msg_001',
  timestamp: 1700000001000
}
```

#### Live2D动作指令
```typescript
{
  type: 'live2d_action',
  payload: {
    action: 'tap_body',      // 点击身体
    motion: 'idle',          // 播放空闲动画
    expression: 'happy',     // 表情
    tracking: 'none'         // 目光追踪: 'mouse' | 'none'
  }
}
```

#### 系统监控
```typescript
{
  type: 'system_notification',
  payload: {
    title: 'CPU预警',
    body: 'CPU使用率已达85%',
    level: 'warning'  // 'info' | 'warning' | 'critical'
  }
}
```

### 3.3 连接流程

```
1. 桌面端启动
      ↓
2. 建立WebSocket连接 (wss://your-server.com/ws)
      ↓
3. 认证 (发送token)
      ↓
4. 认证成功 → 开始会话
      ↓
5. 双向消息传递
      ↓
6. 断开连接 → 重连机制
```

---

## 4. 功能模块规格

### 4.1 Live2D渲染模块

**功能**：
- 加载并渲染Live2D模型（.moc3 + .model3.json）
- 响应云端动作指令（表情、动作切换）
- 鼠标/触摸交互（点击触发动作）
- 目光跟随（可选）

**技术实现**：
```typescript
import { Live2D } from 'pixi-live2d-display';

// 加载模型
const model = await Live2D.Live2DModel.from('/models/miku.model3.json');
app.stage.addChild(model);

// 播放动作
model.internalModel.motionManager.startMotion('idle');

// 切换表情
model.internalModel.motionManager.expressionManager?.setExpression('smile');
```

**支持的动画类型**：
| 动画类型 | 触发条件 |
|----------|----------|
| idle | 空闲状态循环 |
| happy | 收到积极反馈 |
| sad | 收到消极反馈 |
| surprised | 意外情况 |
| thinking | 思考中 |
| speaking | 说话时 |

### 4.2 语音模块

#### TTS（文字转语音）
- **方案**：云端Edge-TTS生成 → 推送URL到桌面端 → 本地播放
- **支持角色**：云希、小美、晓晓等
- **控制**：播放、暂停、停止、音量调节

#### STT（语音转文字）
- **方案**：桌面端录音 → 上传到云端 → Whisper识别 → 返回文字
- **触发方式**：按住说话按钮 / 语音唤醒词（可选）
- **格式**：WebM/Opus

### 4.3 系统监控模块

| 监控项 | 频率 | 阈值 |
|--------|------|------|
| CPU使用率 | 30s | >90% 警告 |
| 内存使用率 | 30s | >85% 警告 |
| 磁盘剩余 | 60s | <10GB 警告 |
| 电池电量 | 60s | <20% 警告 |

**通知方式**：
- 看板娘动画提醒 + 桌面通知

### 4.4 天气/日程播报

- 每天固定时间（如早9点）自动播报天气
- 日程提醒（结合日历API）
- 看板娘相关动作：走到窗边看天气

---

## 5. UI/UX设计

### 5.1 窗口设计

```
┌────────────────────────────────────────┐
│  ▪▪▪  OpenClaw Companion    ─ □ ✕    │  ← 标题栏（可拖拽）
├────────────────────────────────────────┤
│                                        │
│           [Live2D 看板娘]              │
│                                        │
│         ◠ ◠  (眼睛跟随鼠标)            │
│           ▽    (嘴巴动画)              │
│                                        │
├────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 对话气泡区域 (可收起)             │   │
│  └─────────────────────────────────┘   │
├────────────────────────────────────────┤
│  🎤  [文字输入框........]  📎  ➤     │  ← 底部控制栏
└────────────────────────────────────────┘
```

### 5.2 窗口特性

- **置顶**：可选总在最前
- **透明背景**：可调节透明度
- **拖拽移动**：拖拽看板娘移动位置
- **最小化到托盘**：后台运行
- **快捷键**：
  - `Ctrl+Shift+O`: 显示/隐藏
  - `Ctrl+Shift+V`: 语音输入

### 5.3 设置面板

- 云端服务器地址配置
- 认证Token
- TTS声音选择
- 启动项设置
- 透明度/置顶设置

---

## 6. 部署方案

### 6.1 云端部署

```bash
# Docker Compose 方案
services:
  openclaw-gateway:
    image: openclaw/gateway:latest
    ports:
      - "8080:8080"
      - "8765:8765"  # WebSocket

  # 可选：TTS服务
  tts-service:
    image: openclaw/tts:latest
```

### 6.2 桌面端构建

```bash
# 开发
npm run tauri dev

# 构建发布
npm run tauri build
```

---

## 7. 安全考虑

### 认证
- WebSocket连接使用Token认证
- Token存储在系统安全存储（Windows Credential / macOS Keychain）

### 隐私
- 语音数据仅上传到配置的云端
- 本地不持久化对话记录（可选）

---

## 8. 里程碑

| 阶段 | 目标 | 预计时间 |
|------|------|----------|
| Phase 1 | Demo基础：Tauri + Live2D渲染 + 静态对话 | 1周 |
| Phase 2 | 云端连接：WebSocket通信 + 动态对话 | 1周 |
| Phase 3 | 语音能力：TTS播放 + STT输入 | 1周 |
| Phase 4 | 系统监控：CPU/内存监控 + 通知 | 3天 |
| Phase 5 | 完善：设置面板 + 托盘 + 打包发布 | 1周 |

---

## 9. 附录

### 参考项目
- [PPet](https://github.com/zenghongtu/PPet) - Tauri桌面萌妹
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) - Live2D渲染库
- [my-neuro](https://github.com/morettt/my-neuro) - AI桌面伴侣

### 资源
- Live2D免费模型：[Eikanya/Live2d-model](https://github.com/Eikanya/Live2d-model)
- Live2D Cubism SDK：[官方下载](https://www.live2d.com/download/)

---

*文档版本: v0.1*
*最后更新: 2024*
