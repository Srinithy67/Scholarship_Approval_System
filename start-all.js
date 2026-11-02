const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'MOCK-API', cwd: path.join(__dirname, 'mock-api'), cmd: 'npm', args: ['start'], color: '\x1b[36m' },
  { name: 'WORKERS ', cwd: path.join(__dirname, 'workers'), cmd: 'npm', args: ['start'], color: '\x1b[35m' },
  { name: 'BFF     ', cwd: path.join(__dirname, 'bff'), cmd: 'npm', args: ['start'], color: '\x1b[34m' },
  { name: 'FRONTEND', cwd: path.join(__dirname, 'frontend'), cmd: 'npm', args: ['run', 'dev'], color: '\x1b[32m' },
];

console.log('\x1b[1m\x1b[32mStarting Scholarship Approval Automation System (All 4 Services)...\x1b[0m\n');

services.forEach(({ name, cwd, cmd, args, color }) => {
  const p = spawn(cmd, args, { cwd, stdio: ['inherit', 'pipe', 'pipe'], shell: true });

  p.stdout.on('data', (d) => {
    process.stdout.write(`${color}[${name}]\x1b[0m ${d.toString()}`);
  });

  let lastUnavailableNotice = 0;
  p.stderr.on('data', (d) => {
    const str = d.toString();
    if (str.includes('14 UNAVAILABLE') || str.includes('UNAVAILABLE:')) {
      const now = Date.now();
      if (now - lastUnavailableNotice > 30000) {
        lastUnavailableNotice = now;
        console.log(`${color}[${name}]\x1b[0m \x1b[33mℹ️  Camunda 8 SaaS cluster is hibernating in cloud.camunda.io (14 UNAVAILABLE). Standby workflow engine is active for frontend demo. Resume cluster in Camunda Console to connect live.\x1b[0m`);
      }
    } else {
      process.stderr.write(`${color}[${name} ERR]\x1b[0m ${str}`);
    }
  });

  p.on('exit', (code) => {
    console.log(`${color}[${name}]\x1b[0m Exited with code ${code}`);
  });
});

console.log('\x1b[1m\x1b[33mAccess Links:\x1b[0m');
console.log('  ➜  \x1b[1m\x1b[32mFrontend Portal:\x1b[0m http://localhost:5173');
console.log('  ➜  \x1b[1m\x1b[34mBackend-for-Frontend (BFF):\x1b[0m http://localhost:3001');
console.log('  ➜  \x1b[1m\x1b[36mMock Accounts API:\x1b[0m http://localhost:4000\n');
