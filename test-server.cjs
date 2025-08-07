console.log('Starting CommonJS test server...');

// Minimal server setup with CommonJS
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('CommonJS test server is running');});

server.listen(3002, '0.0.0.0', () => {
  console.log('CommonJS test server running on port 3002');
  console.log('Test by opening: http://localhost:3002');
});

// Handle any uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
