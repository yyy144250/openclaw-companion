# Madoka

🎭 Madoka 桌面看板娘 - Live2D 虚拟形象桌面应用

## 功能特性

- 🗣️ AI 对话 - 连接云端服务实现智能对话
- 🎬 Live2D 动画 - 虚拟形象实时渲染，支持表情和动作
- 🔊 语音合成 (TTS) - 云端生成语音，本地播放
- 🎤 语音识别 (STT) - 支持语音输入
- 💻 系统监控 - CPU/内存/电池监控与提醒
- ⚙️ 跨平台 - Windows & macOS 支持

## 快速开始

### 1. 克隆项目

```bash
git clone <this-repo>
cd madoka
npm install
```

### 2. 添加 Live2D 模型

```bash
# 方式1: 使用PPet的模型
git clone https://github.com/zenghongtu/PPet.git /tmp/ppet
cp -r /tmp/ppet/static/models/* public/models/

# 方式2: 使用Eikanya的模型集合
git clone https://github.com/Eikanya/Live2d-model.git
# 复制喜欢的模型到 public/models/
```

### 3. 配置模型路径

编辑 `src/App.tsx`:
```tsx
<Live2DViewer modelPath="/models/你的模型/model3.json" />
```

### 4. 构建安装包

```bash
# 确保已安装 Rust
# https://rustup.rs/

npm run tauri build
```

构建产物在 `src-tauri/target/release/bundle/`:
- Windows: `.exe` / `.msi` 安装包
- macOS: `.dmg` 安装包

### 5. 运行云端服务（可选）

```bash
cd server
npm install
npm start
```

默认端口: `8765`

## 配置

在应用内点击设置按钮，配置：

- **服务器地址**: WebSocket 服务器地址
  - 本地开发: `ws://localhost:8765`
  - 云端部署: `ws://your-server.com:8765`
- **认证Token**: 云端认证令牌
- **TTS 音色**: 选择语音
- **窗口置顶**: 始终显示在最前

## 项目结构

```
madoka/
├── src/
│   ├── components/     # React 组件
│   │   ├── Live2DViewer.tsx    # Live2D 渲染
│   │   ├── ChatInput.tsx       # 聊天输入
│   │   ├── ChatMessages.tsx   # 消息显示
│   │   └── SettingsPanel.tsx  # 设置面板
│   ├── stores/        # Zustand 状态管理
│   ├── services/      # WebSocket 通信服务
│   └── types/         # TypeScript 类型定义
├── public/models/     # Live2D 模型目录
├── server/           # 云端 WebSocket 服务
└── src-tauri/        # Tauri 后端配置
```

## 技术栈

- **框架**: Tauri 2.x
- **前端**: React 19 + TypeScript
- **Live2D**: pixi-live2d-display
- **状态**: Zustand
- **通信**: WebSocket
- **服务端**: Node.js + ws

## 云端部署

### Docker 部署

```yaml
# docker-compose.yml
version: '3'
services:
  madoka-server:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./server:/app
    ports:
      - "8765:8765"
    environment:
      - LLM_API=http://your-llm-gateway:8080
    command: sh -c "npm install && npm start"
```

### 对接 LLM Gateway

服务端需要配置 `LLM_API` 环境变量指向你的 LLM Gateway。

## 常见问题

**Q: 模型加载失败**
A: 检查模型路径是否正确，确保 model3.json 存在

**Q: 无法连接服务器**
A: 检查服务器地址和Token配置

**Q: 构建失败**
A: 确保已安装 Rust: `rustup default stable`

## License

MIT
