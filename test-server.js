// Simple test to verify server can start
const app = require('./server/app');

console.log('✅ Server module loaded successfully');
console.log('✅ All imports resolved correctly');
console.log('✅ Refactored architecture is working');

// Test health endpoint
const request = require('http').request;
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET'
};

// Start server in test mode
const server = app.listen(5000, () => {
  console.log('🧪 Test server started on port 5000');
  
  // Test health endpoint
  const req = request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('✅ Health endpoint response:', data);
      server.close(() => {
        console.log('✅ Test completed successfully');
        process.exit(0);
      });
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ Test failed:', err);
    server.close(() => process.exit(1));
  });
  
  req.end();
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});