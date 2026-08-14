const http = require('http');
const express = require('express');
const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const server = app.listen(3998, () => {
  http.get('http://localhost:3998/api/auth/providers', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      console.log('Providers Config Response:', data);
      const json = JSON.parse(data);
      if (res.statusCode === 200 && json && json.google) {
        console.log('✅ Google SSO Providers Endpoint test PASSED!');
      } else {
        console.log('❌ Google SSO Providers Endpoint test FAILED!');
      }
      server.close();
      process.exit(0);
    });
  });
});
