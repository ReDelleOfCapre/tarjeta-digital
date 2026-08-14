const http = require('http');
const express = require('express');
const app = express();
const perfilesRouter = require('../routes/perfiles');

app.use('/api/perfiles', perfilesRouter);

const server = app.listen(3999, () => {
  http.get('http://localhost:3999/api/perfiles/cantera-cocina/qr', (res) => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log('Buffer length:', buffer.length, 'bytes');
      if (res.statusCode === 200 && res.headers['content-type'] === 'image/png' && buffer.length > 500) {
        console.log('✅ QR Code Endpoint test PASSED!');
      } else {
        console.log('❌ QR Code Endpoint test FAILED!');
      }
      server.close();
      process.exit(0);
    });
  });
});
