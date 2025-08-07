console.log('Starting test server...');

// Minimal server setup
try {
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Test server is running');
  });

  server.listen(3002, () => {
    console.log('Test server running on port 3002');
  });
} catch (error) {
  console.error('Error in test server:', error);
  process.exit(1);
}
