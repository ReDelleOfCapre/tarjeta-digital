const http = require('http');
const express = require('express');
const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const server = app.listen(3997, () => {
  const reqData = JSON.stringify({ email: 'usuario.sso@vynk.app' });
  const req = http.request('http://localhost:3997/api/auth/magic-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const json = JSON.parse(body);
      console.log('Magic Code Request:', json);
      const demoCode = json.demoCode;

      const verifyData = JSON.stringify({ email: 'usuario.sso@vynk.app', code: demoCode });
      const reqVerify = http.request('http://localhost:3997/api/auth/verify-magic-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
      }, (res2) => {
        let body2 = '';
        res2.on('data', c => body2 += c);
        res2.on('end', () => {
          const json2 = JSON.parse(body2);
          console.log('Verify Status:', res2.statusCode);
          console.log('Verify Payload:', json2.ok ? 'Token Issued ✅' : json2);

          if (res2.statusCode === 200 && json2.token && json2.usuario) {
            console.log('✅ Passwordless Magic OTP SSO Test PASSED!');
          } else {
            console.log('❌ Passwordless Magic OTP SSO Test FAILED!');
          }
          server.close();
          process.exit(0);
        });
      });
      reqVerify.write(verifyData);
      reqVerify.end();
    });
  });
  req.write(reqData);
  req.end();
});
