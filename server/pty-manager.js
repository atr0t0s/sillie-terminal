const pty = require('node-pty');
const os = require('node:os');

const sessions = new Map();

function create(id, { cols = 80, rows = 24, shell, onData, onExit } = {}) {
  if (sessions.has(id)) return sessions.get(id);

  const shellPath = shell || process.env.SHELL || '/bin/zsh';
  const proc = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color' },
  });

  if (onData) proc.onData(onData);
  if (onExit) proc.onExit(onExit);

  sessions.set(id, proc);
  return proc;
}

function get(id) { return sessions.get(id); }

function write(id, data) {
  const proc = sessions.get(id);
  if (proc) proc.write(data);
}

function resize(id, cols, rows) {
  const proc = sessions.get(id);
  if (proc) proc.resize(cols, rows);
}

function close(id) {
  const proc = sessions.get(id);
  if (proc) {
    proc.kill();
    sessions.delete(id);
  }
}

function listIds() { return Array.from(sessions.keys()); }

function closeAll() {
  for (const [id] of sessions) close(id);
}

module.exports = { create, get, write, resize, close, listIds, closeAll };
