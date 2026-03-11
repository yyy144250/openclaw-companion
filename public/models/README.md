# Live2D 模型目录

## 放置模型

将你的 Live2D 模型文件放入此目录。

## 模型格式

推荐使用 **Live2D Cubism 3** 或 **Cubism 4/5** 格式：

```
models/
├── your-model/
│   ├── your-model.model3.json   # 主配置文件
│   ├── your-model.moc3          # 模型数据
│   ├── your-model.physics3.json # 物理设置(可选)
│   ├── motions/                 # 动作文件
│   │   ├── idle.motion3.json
│   │   └── tap_body.motion3.json
│   ├── expressions/            # 表情文件
│   │   ├── happy.expression3.json
│   │   └── sad.expression3.json
│   └── textures/               # 纹理图片
│       └── texture_00.png
```

## 免费模型资源

### 1. PPet 项目
```bash
# PPet内置模型
git clone https://github.com/zenghongtu/PPet.git
# 模型在 static/models 目录
```

### 2. Eikanya/Live2d-model
```bash
git clone https://github.com/Eikanya/Live2d-model
# 包含大量游戏模型
```

### 3. Live2D 官方Samples
- https://www.live2d.com/download/

## 使用模型

在应用中修改模型路径：

```tsx
// src/App.tsx
<Live2DViewer modelPath="/models/your-model/your-model.model3.json" />
```

## 推荐入门模型

1. **PPet默认模型** - 来自 https://github.com/zenghongtu/PPet/tree/dev/static/models
2. **Miku** - 来自 Live2D 官方Samples
3. **22** - 碧蓝航线角色 (Eikanya/Live2d-model)

## 注意事项

- 使用 Cubism 5 模型需要额外的 SDK
- 免费模型仅限个人使用
- 部分模型需要配置正确的 `model3.json`
