const http = require('http');
const express = require('express');
const { fetchUrlMetadata } = require('../services/metadataService');

const app = express();
app.use(express.json());

app.post('/api/metadata/analyze-connections', async (req, res) => {
  try {
    const { urls } = req.body || {};
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'Se requiere un arreglo de URLs' });
    }

    const cleanUrls = urls.filter(u => typeof u === 'string' && u.trim().length > 0).slice(0, 20);
    const resultados = await Promise.all(
      cleanUrls.map(async (u) => {
        const meta = await fetchUrlMetadata(u);
        return {
          url: u,
          ...meta
        };
      })
    );

    res.json({
      ok: true,
      total_analizadas: resultados.length,
      conexiones: resultados
    });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

const server = app.listen(3996, () => {
  const reqData = JSON.stringify({
    urls: [
      'https://github.com',
      'https://spotify.com'
    ]
  });

  const req = http.request('http://localhost:3996/api/metadata/analyze-connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const json = JSON.parse(body);
      console.log('HTTP Status:', res.statusCode);
      console.log('Connections Response:', JSON.stringify(json, null, 2));

      if (res.statusCode === 200 && json.ok && json.conexiones.length === 2) {
        console.log('✅ Metadata Connections Analyzer Test PASSED!');
      } else {
        console.log('❌ Metadata Connections Analyzer Test FAILED!');
      }
      server.close();
      process.exit(0);
    });
  });

  req.write(reqData);
  req.end();
});
