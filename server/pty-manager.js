const pty = require('node-pty');
const os = require('node:os');

const sessions = new Map();
const MAX_SCROLLBACK = 50_000; // chars to keep for reconnection

function create(id, { cols = 80, rows = 24, shell, cwd, env, onData, onExit } = {}) {
  if (sessions.has(id)) {
    const existing = sessions.get(id);
    // Reconnect: replay scrollback buffer
    if (onData && existing.scrollback) {
      onData(existing.scrollback);
    }
    // Update callbacks for reconnection
    if (onData) existing._onData = onData;
    if (onExit) existing._onExit = onExit;
    return existing.proc;
  }

  const shellPath = shell || process.env.SHELL || '/bin/zsh';
  const proc = pty.spawn(shellPath, ['--login'], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: cwd || os.homedir(),
    env: env || undefined,
  });

  const session = {
    proc,
    scrollback: '',
    _onData: onData,
    _onExit: onExit,
    createdAt: Date.now(),
  };

  proc.onData((data) => {
    // Accumulate scrollback
    session.scrollback += data;
    if (session.scrollback.length > MAX_SCROLLBACK) {
      session.scrollback = session.scrollback.slice(-MAX_SCROLLBACK);
    }
    if (session._onData) session._onData(data);
  });

  proc.onExit((info) => {
    if (session._onExit) session._onExit(info);
    sessions.delete(id);
  });

  sessions.set(id, session);
  return proc;
}

function get(id) {
  const s = sessions.get(id);
  return s ? s.proc : undefined;
}

function write(id, data) {
  const s = sessions.get(id);
  if (s) s.proc.write(data);
}

function resize(id, cols, rows) {
  const s = sessions.get(id);
  if (s) s.proc.resize(cols, rows);
}

function close(id) {
  const s = sessions.get(id);
  if (s) {
    s.proc.kill();
    sessions.delete(id);
  }
}

function listIds() { return Array.from(sessions.keys()); }

function closeAll() {
  for (const [id] of sessions) close(id);
}

// Detach callbacks (for WS disconnect without killing the PTY)
function detach(id) {
  const s = sessions.get(id);
  if (s) {
    s._onData = null;
    s._onExit = null;
  }
}

module.exports = { create, get, write, resize, close, listIds, closeAll, detach };
