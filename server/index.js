/**
 * Madoka Cloud Server
 * WebSocket服务端 - 处理桌面客户端的连接和消息
 * 直接调用LLM API
 * 
 * 使用方法:
 *   pip install edge-tts   (Python TTS依赖)
 *   npm install ws
 *   node index.js
 * 
 * 或使用Docker部署
 */

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');

// 配置
const PORT = process.env.PORT || 8765;
const TTS_VOICE = process.env.TTS_VOICE || 'zh-CN-XiaoxiaoNeural';
const HOST = process.env.HOST || '0.0.0.0';

// TTS 缓存目录
const TTS_CACHE_DIR = path.join(__dirname, 'tts_cache');
if (!fs.existsSync(TTS_CACHE_DIR)) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
}

// 检查 edge-tts 是否可用
let edgeTtsAvailable = false;
execFile('edge-tts', ['--version'], (err) => {
  if (!err) {
    edgeTtsAvailable = true;
    console.log('✅ edge-tts 已就绪');
  } else {
    console.warn('⚠️  edge-tts 未安装，语音功能不可用。请运行: pip install edge-tts');
  }
});

/**
 * 使用 edge-tts 生成语音
 * @param {string} text - 要合成的文本
 * @param {string} voice - 语音角色
 * @returns {Promise<string|null>} - 生成的音频文件名，失败返回 null
 */
function generateTTS(text, voice = TTS_VOICE) {
  return new Promise((resolve) => {
    if (!edgeTtsAvailable) {
      console.warn('edge-tts 不可用，跳过语音合成');
      resolve(null);
      return;
    }

    // 用文本 hash 作为文件名，避免重复生成
    const hash = crypto.createHash('md5').update(text + voice).digest('hex').substring(0, 12);
    const filename = `tts_${hash}.mp3`;
    const filepath = path.join(TTS_CACHE_DIR, filename);

    // 如果缓存中已有，直接返回
    if (fs.existsSync(filepath)) {
      console.log(`🔊 TTS 缓存命中: ${filename}`);
      resolve(filename);
      return;
    }

    console.log(`🔊 生成语音: "${text.substring(0, 30)}..." → ${filename}`);

    execFile('edge-tts', [
      '--voice', voice,
      '--text', text,
      '--write-media', filepath
    ], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ TTS 生成失败:', err.message);
        resolve(null);
        return;
      }
      
      // 确认文件已生成
      if (fs.existsSync(filepath)) {
        console.log(`✅ TTS 生成成功: ${filename}`);
        resolve(filename);
      } else {
        console.error('❌ TTS 文件未生成');
        resolve(null);
      }
    });
  });
}

// 定期清理 TTS 缓存（保留最近 1 小时的文件）
function cleanTTSCache() {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 小时

  try {
    const files = fs.readdirSync(TTS_CACHE_DIR);
    let cleaned = 0;
    for (const file of files) {
      const filepath = path.join(TTS_CACHE_DIR, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filepath);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个过期 TTS 缓存文件`);
    }
  } catch (e) {
    // ignore
  }
}

// 每 30 分钟清理一次缓存
setInterval(cleanTTSCache, 30 * 60 * 1000);

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
    res.end(JSON.stringify({ 
      status: 'ok', 
      clients: wss?.clients?.size || 0,
      tts: edgeTtsAvailable ? 'available' : 'unavailable'
    }));
    return;
  }

  // TTS 音频文件静态服务
  if (req.url?.startsWith('/tts/') && req.method === 'GET') {
    const filename = path.basename(req.url);
    const filepath = path.join(TTS_CACHE_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      const stat = fs.statSync(filepath);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=3600',
      });
      fs.createReadStream(filepath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Audio not found');
    }
    return;
  }

  // TTS合成API（HTTP方式）
  if (req.url === '/api/tts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, voice = TTS_VOICE } = JSON.parse(body);
        const filename = await generateTTS(text, voice);
        
        if (filename) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            audio_url: `/tts/${filename}`,
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: edgeTtsAvailable ? 'TTS 生成失败' : 'edge-tts 未安装',
          }));
        }
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

console.log(`🚀 Madoka Server starting on port ${PORT}`);

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

// 获取当前服务器的外部 URL（用于生成 TTS 音频的完整 URL）
function getTTSUrl(filename) {
  // 返回相对路径，客户端会拼接服务器地址
  return `/tts/${filename}`;
}

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
        
        // 发送欢迎消息（带语音）
        const welcomeText = '你好！我是Madoka，已连接到云端服务~';
        const ttsFile = await generateTTS(welcomeText);
        
        ws.send(JSON.stringify({
          type: 'chat_response',
          payload: {
            text: welcomeText,
            tts_url: ttsFile ? getTTSUrl(ttsFile) : null,
            live2d_action: 'idle',
            live2d_expression: 'smile'
          },
          id: `msg_${Date.now()}`,
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
        
        // 为回复生成 TTS 语音
        const ttsFile = await generateTTS(llmResponse);
        
        // 发送回复（带语音URL）
        const responseMsg = {
          type: 'chat_response',
          payload: {
            text: llmResponse,
            tts_url: ttsFile ? getTTSUrl(ttsFile) : null,
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

    case 'tts':
      // 独立 TTS 请求
      const ttsText = message.payload?.text;
      const ttsVoice = message.payload?.voice || TTS_VOICE;
      if (ttsText) {
        const ttsFile = await generateTTS(ttsText, ttsVoice);
        ws.send(JSON.stringify({
          type: 'tts_audio',
          payload: { 
            audio_url: ttsFile ? getTTSUrl(ttsFile) : null,
            error: ttsFile ? null : 'TTS 生成失败'
          },
          id: message.id,
          timestamp: Date.now()
        }));
      }
      break;

    default:
      console.log(`📝 Unknown message type: ${message.type}`);
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

// 广播消息给所有客户端
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

server.listen(PORT, HOST, () => {
  console.log(`✅ Server running at ws://${HOST}:${PORT}`);
  console.log(`   公网地址: ws://8.129.86.214:${PORT}`);
  console.log(`   HTTP API at http://${HOST}:${PORT}`);
  console.log(`   TTS cache: ${TTS_CACHE_DIR}`);
  console.log(`   TTS voice: ${TTS_VOICE}`);
  console.log(`   TTS ready: ${edgeTtsAvailable ? 'yes' : 'no (install: pip install edge-tts)'}`);
});
