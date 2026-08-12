const fs = require('fs');
const html = fs.readFileSync('public/dashboard.html', 'utf8');
// Detectar variación selector solitarios U+FE0F
const stray = html.match(/[\u{FE0F}]/gu);
console.log('Selectores de variación U+FE0F: ' + (stray ? stray.length : 0));
// Detectar lineas con emojis residuales
const lines = html.split('\n');
lines.forEach((l, i) => {
  const m = l.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  if (m) console.log((i+1) + ': ' + m.join('') + ' | ' + l.trim().substring(0, 60));
});
