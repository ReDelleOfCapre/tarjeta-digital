const fs = require('fs');
const path = require('path');

const dirs = ['public', 'views'];
let htmlFiles = [];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      if (f.endsWith('.html')) htmlFiles.push(path.join(dir, f));
    });
  }
});

console.log(`Auditando ${htmlFiles.length} páginas HTML...`);

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasSfPro = content.includes('SF Pro') || content.includes('tokens.css') || content.includes('styles.css');
  const hasViewportFit = content.includes('viewport-fit=cover');
  const selects = (content.match(/<select[\s>]/g) || []).length;
  const radioChips = (content.match(/radio-chip/g) || []).length;

  console.log(`\n📄 [${file}]`);
  console.log(`  - Apple CSS/Tokens: ${hasSfPro ? '✅ Sí' : '⚠️ No'}`);
  console.log(`  - iOS Safe Area Viewport: ${hasViewportFit ? '✅ Sí' : '⚠️ No'}`);
  console.log(`  - Radio Chips / Selects: ${radioChips} chips / ${selects} selects`);
});
