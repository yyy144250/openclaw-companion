/**
 * OpenClaw Companion Cloud Server
 * WebSocket服务端 - 处理桌面客户端的连接和消息
 * 直接调用LLM API
 */

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 配置
const PORT = process.env.PORT || 8765;

// MiniMax LLM配置
const LLM_CONFIG = {
  baseUrl: 'https://api.minimaxi.com/v1',
  apiKey: 'sk-cp-PffADK-sNdSAQo-cS6vouuAG49iwWT6Ygoe7yCJVkhPX-SnccPwi0W7LabSWYJoSnd_6zbTihZBahJeUEtPutwWgF_ujc0in1SyMQk1c9rFjuzawUN6uFTk',
  model: 'MiniMax-M2.5'
};

// HTTP服务器
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: wss?.clients?.size || 0 }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket服务器
const wss = new WebSocket.Server({ server });

console.log(`🚀 OpenClaw Companion Server starting on port ${PORT}`);

wss.on('connection', (ws, req) => {
  const clientId = `client_${Date.now()}`;
  const ip = req.socket.remoteAddress;
  
  console.log(`📱 Client connected: ${clientId} from ${ip}`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'chat_response',
    payload: {
      text: '你好！我是拟蓑白，你的桌面伴侣~ 🗣️ 可以和我聊天哦！',
      live2d_action: 'idle',
      live2d_expression: 'smile'
    },
    id: `welcome_${Date.now()}`,
    timestamp: Date.now()
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(ws, message);
    } catch (e) {
      console.error('❌ Failed to parse message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${clientId}`);
  });
});

// 处理消息
async function handleMessage(ws, message) {
  switch (message.type) {
    case 'system':
      if (message.payload?.action === 'auth') {
        ws.send(JSON.stringify({
          type: 'connection_status',
          payload: { status: 'authenticated' },
          id: message.id,
          timestamp: Date.now()
        }));
      }
      break;

    case 'chat':
      const userMessage = message.payload?.message;
      if (!userMessage) return;
      
      console.log(`💬 Chat: ${userMessage}`);
      
      // 发送正在思考
      ws.send(JSON.stringify({
        type: 'live2d_action',
        payload: { motion: 'thinking' },
        id: message.id,
        timestamp: Date.now()
      }));

      try {
        // 调用LLM
        console.log('🤖 Calling LLM...');
        const llmResponse = await callLLM(userMessage);
        console.log('🤖 LLM response:', llmResponse.substring(0, 50));
        
        // 发送回复
        const responseMsg = {
          type: 'chat_response',
          payload: {
            text: llmResponse,
            live2d_action: 'idle',
            live2d_expression: getExpression(llmResponse)
          },
          id: message.id,
          timestamp: Date.now()
        };
        console.log('📤 Sending response:', JSON.stringify(responseMsg).substring(0, 100));
        ws.send(JSON.stringify(responseMsg));
        console.log('✅ Response sent');
      } catch (e) {
        console.error('❌ LLM error:', e);
        ws.send(JSON.stringify({
          type: 'chat_response',
          payload: {
            text: '抱歉，我刚才走神了~ 可以再说一遍吗？',
            live2d_action: 'sad'
          },
          id: message.id,
          timestamp: Date.now()
        }));
      }
      break;
  }
}

// 调用MiniMax LLM
async function callLLM(text) {
  const url = `${LLM_CONFIG.baseUrl}/text/chatcompletion_v2`;
  
  const body = {
    model: LLM_CONFIG.model,
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: '你是拟蓑白，一个理性、冷静、书卷气的AI助手。回答要简洁、有帮助。'
      },
      {
        role: 'user',
        content: text
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '收到消息~';
}

// 根据文本获取表情
function getExpression(text) {
  const happyWords = ['开心', '高兴', '好', '棒', '喜欢', '么么哒', '爱你', '谢谢', '哈哈'];
  const sadWords = ['难过', '伤心', '抱歉', '对不起', '呜呜'];
  
  for (const word of happyWords) {
    if (text.includes(word)) return 'happy';
  }
  for (const word of sadWords) {
    if (text.includes(word)) return 'sad';
  }
  
  return 'neutral';
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on ws://0.0.0.0:${PORT}`);
  console.log(`   公网地址: ws://8.129.86.214:${PORT}`);
});
