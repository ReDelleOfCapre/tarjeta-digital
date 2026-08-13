const fs = require('fs');
const path = require('path');

const cssPath = 'C:\\Users\\gpprz\\Downloads\\OS - iOS 27 - Apple (MX)_files\\ios.built.css';
if (fs.existsSync(cssPath)) {
  const content = fs.readFileSync(cssPath, 'utf8');
  
  // Extract typography selectors like .typography-hero-headline, .typography-headline, etc.
  const typoRules = content.match(/\.typography-[^{]+\{[^}]+\}/g) || [];
  console.log(`Found ${typoRules.length} Apple typography rules:`);
  typoRules.slice(0, 15).forEach(rule => console.log(rule));
}
