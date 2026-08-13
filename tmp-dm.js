const fs = require('fs');
for (const f of ['public/index.html','public/planes.html','public/legal.html']) {
  const html = fs.readFileSync(f, 'utf8');
  const violet = html.split('\n').map((l,i)=>(l.includes('#7C3AED')||l.includes('#5C48E6')||l.includes('#06B6D4')||l.includes('124,58,237')||l.includes('#EEEAFC')||l.includes('#A78BFA')) ? (i+1)+': '+l.trim().substring(0,65) : null).filter(Boolean).slice(0,12);
  const emoji = html.split('\n').map((l,i)=>{const m=l.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu); return m? (i+1)+': '+m.join('') : null;}).filter(Boolean).slice(0,8);
  console.log(f);
  console.log('  Violetas: ' + (violet.length? violet.join('\n  ') : '0'));
  console.log('  Emojis: ' + (emoji.length? emoji.join(' | ') : '0'));
}
