const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('==============================================================');
console.log('🚀 Launching INTERVIX AI Full-Stack Environment...');
console.log('📦 Starting Backend API (port 5000) & Frontend UI (port 5173)');
console.log('==============================================================\n');

const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'server'),
  stdio: 'inherit',
  shell: true,
});

const clientProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'client'),
  stdio: 'inherit',
  shell: true,
});

const handleExit = () => {
  try {
    serverProcess.kill();
  } catch {}
  try {
    clientProcess.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
