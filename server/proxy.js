const net = require('net');

const PORT = 8080;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 8765;

const server = net.createServer((socket) => {
  const target = net.createConnection({
    host: TARGET_HOST,
    port: TARGET_PORT
  });

  target.on('connect', () => {
    console.log(`🔄 Proxy: ${socket.remoteAddress} -> ${TARGET_HOST}:${TARGET_PORT}`);
  });

  socket.pipe(target);
  target.pipe(socket);

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
    target.end();
  });

  target.on('error', (err) => {
    console.error('Target error:', err.message);
    socket.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ TCP Proxy running on port ${PORT}`);
  console.log(`   转发到 ${TARGET_HOST}:${TARGET_PORT}`);
});
