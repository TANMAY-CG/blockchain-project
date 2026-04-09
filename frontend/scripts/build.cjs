const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));

// Keeps assets/ present for hosts that omit empty directories from uploads.
fs.writeFileSync(path.join(dist, 'assets', '.gitkeep'), '');

console.log('Build: wrote', path.relative(root, dist));
