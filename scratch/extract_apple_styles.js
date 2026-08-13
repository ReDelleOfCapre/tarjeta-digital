const fs = require('fs');
const path = require('path');

const appleDir = 'C:\\Users\\gpprz\\Downloads\\OS - iOS 27 - Apple (MX)_files';
const cssFiles = ['ios.built.css', 'globalheader.css', 'modal.css'];

cssFiles.forEach(file => {
  const fullPath = path.join(appleDir, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`=== FILE: ${file} (Size: ${content.length} chars) ===`);
    
    // Find font-family occurrences
    const fontMatches = content.match(/font-family:[^;}]+/g) || [];
    console.log('Font families:', [...new Set(fontMatches)].slice(0, 10));
    
    // Find font-style / letter-spacing / line-height / typography tokens
    const fontFaceMatches = content.match(/@font-face\s*\{[^}]+\}/g) || [];
    console.log('@font-face definitions count:', fontFaceMatches.length);
    if (fontFaceMatches.length > 0) {
      console.log('Sample @font-face:', fontFaceMatches.slice(0, 3));
    }
  }
});
