/**
 * OpenClaw Companion Cloud Server
 * WebSocket服务端 - 处理桌面客户端的连接和消息
 * 
 * 使用方法:
 *   npm install ws
 *   node server.js
 * 
 * 或使用Docker部署
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const PORT = process.env.PORT || 8765;
const LLM_API = process.env.LLM_API || 'http://localhost:8080'; // OpenClaw Gateway
const TTS_API = process.env.TTS_API || 'http://localhost:8080';

// 简单的HTTP服务器 - 提供静态资源和API
const server = http.createServer(async (req, res) => {
  // CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 健康检查
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: wss?.clients?.size || 0 }));
    return;
  }

  // TTS合成API
  if (req.url === '/api/tts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, voice = 'zh-CN-XiaoxiaoNeural' } = JSON.parse(body);
        
        // 调用TTS服务 (这里需要对接实际的TTS服务)
        // 暂时返回模拟响应
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          audio_url: null, // 实际应返回音频URL
          message: 'TTS暂未配置，请配置TTS服务'
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket服务器
const wss = new WebSocket.Server({ server });

// 连接的客户端
const clients = new Map();

console.log(`🚀 OpenClaw Companion Server starting on port ${PORT}`);

wss.on('connection', (ws, req) => {
  const clientId = `client_${Date.now()}`;
  const ip = req.socket.remoteAddress;
  
  console.log(`📱 Client connected: ${clientId} from ${ip}`);
  clients.set(ws, { id: clientId, authenticated: false });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(ws, message);
    } catch (e) {
      console.error('❌ Failed to parse message:', e);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' },
        id: 'error',
        timestamp: Date.now()
      }));
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    console.log(`👋 Client disconnected: ${client?.id}`);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// 处理消息
async function handleMessage(ws, message) {
  const client = clients.get(ws);
  
  switch (message.type) {
    case 'system':
      // 认证
      if (message.payload?.action === 'auth') {
        const token = message.payload.token;
        // 这里验证token
        client.authenticated = true;
        client.token = token;
        
        ws.send(JSON.stringify({
          type: 'connection_status',
          payload: { status: 'authenticated' },
          id: message.id,
          timestamp: Date.now()
        }));
        
        // 发送欢迎消息
        ws.send(JSON.stringify({
          type: 'chat_response',
          payload: {
            text: '你好！我是OpenClaw Companion，已连接到云端服务~',
            live2d_action: 'idle',
            live2d_expression: 'smile'
          },
          id: `msg_${Date.now()}`,
          timestamp: Date.now()
        }));
      }
      break;

    case 'chat':
      // 对话消息
      const userMessage = message.payload.message;
      const mode = message.payload.mode || 'text';
      
      console.log(`💬 Chat from ${client.id}: ${userMessage}`);
      
      // 发送正在思考的状态
      ws.send(JSON.stringify({
        type: 'live2d_action',
        payload: { motion: 'thinking' },
        id: message.id,
        timestamp: Date.now()
      }));

      try {
        // 调用LLM API (对接OpenClaw Gateway)
        const llmResponse = await callLLM(userMessage);
        
        // 发送回复
        ws.send(JSON.stringify({
          type: 'chat_response',
          payload: {
            text: llmResponse.text,
            tts_url: llmResponse.tts_url,
            live2d_action: 'idle',
            live2d_expression: getExpression(llmResponse.text)
          },
          id: message.id,
          timestamp: Date.now()
        }));

        // 如果是语音模式，生成TTS
        if (mode === 'voice' && llmResponse.text) {
          const ttsResult = await callTTS(llmResponse.text);
          if (ttsResult.audio_url) {
            ws.send(JSON.stringify({
              type: 'tts_audio',
              payload: { audio_url: ttsResult.audio_url },
              id: message.id,
              timestamp: Date.now()
            }));
          }
        }
      } catch (e) {
        console.error('❌ LLM error:', e);
        ws.send(JSON.stringify({
          type: 'chat_response',
          payload: {
            text: '抱歉，我现在有点不舒服，请稍后再试~',
            live2d_action: 'sad'
          },
          id: message.id,
          timestamp: Date.now()
        }));
      }
      break;

    case 'tts':
      // TTS请求
      const ttsText = message.payload?.text;
      if (ttsText) {
        const ttsResult = await callTTS(ttsText);
        ws.send(JSON.stringify({
          type: 'tts_audio',
          payload: ttsResult,
          id: message.id,
          timestamp: Date.now()
        }));
      }
      break;

    default:
      console.log(`📝 Unknown message type: ${message.type}`);
  }
}

// 调用LLM
async function callLLM(text) {
  try {
    // 对接OpenClaw Gateway的LLM API
    const response = await fetch(`${LLM_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        // 可添加其他参数
      })
    });
    
    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      text: data.text || data.response || data.message || '收到消息~',
      tts_url: null
    };
  } catch (e) {
    console.error('LLM调用失败:', e);
    // 如果LLM调用失败，返回模拟响应
    return {
      text: `收到消息: ${text}`,
      tts_url: null
    };
  }
}

// 调用TTS
async function callTTS(text) {
  try {
    // 对接TTS服务
    const response = await fetch(`${TTS_API}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: 'zh-CN-XiaoxiaoNeural'
      })
    });
    
    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    console.error('TTS调用失败:', e);
    return { audio_url: null, error: e.message };
  }
}

// 根据文本获取表情
function getExpression(text) {
  const happyWords = ['开心', '高兴', '好', '棒', '喜欢', '么么哒', '爱你'];
  const sadWords = ['难过', '伤心', '抱歉', '对不起', '对不起'];
  
  for (const word of happyWords) {
    if (text.includes(word)) return 'happy';
  }
  for (const word of sadWords) {
    if (text.includes(word)) return 'sad';
  }
  
  return 'neutral';
}

// 广播消息给所有客户端
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// 定时任务 - 系统监控
setInterval(() => {
  // 这里可以添加系统监控逻辑
  // 如CPU、内存使用率等
  // 通过broadcast发送给客户端
}, 30000);

server.listen(PORT, () => {
  console.log(`✅ Server running at ws://localhost:${PORT}`);
  console.log(`   HTTP API at http://localhost:${PORT}`);
});
