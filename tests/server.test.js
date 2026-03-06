const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { WebSocket } = require('ws');
const path = require('node:path');
const os = require('node:os');

// Mock node-pty before anything loads pty-manager
const ptyMockModule = {
  spawn(file, args, opts) {
    const proc = {
      cols: opts.cols,
      rows: opts.rows,
      killed: false,
      _dataCallbacks: [],
      _exitCallbacks: [],
      onData(cb) { proc._dataCallbacks.push(cb); },
      onExit(cb) { proc._exitCallbacks.push(cb); },
      write(data) {
        for (const cb of proc._dataCallbacks) cb(data);
      },
      resize(c, r) { proc.cols = c; proc.rows = r; },
      kill() { proc.killed = true; },
    };
    // Simulate initial shell output after a tick
    setTimeout(() => {
      for (const cb of proc._dataCallbacks) cb('$ ');
    }, 50);
    return proc;
  },
};
require.cache[require.resolve('node-pty')] = {
  id: require.resolve('node-pty'),
  filename: require.resolve('node-pty'),
  loaded: true,
  exports: ptyMockModule,
};

const testConfigDir = path.join(os.tmpdir(), 'sillie-server-test-' + Date.now());
process.env.SILLIE_CONFIG_DIR = testConfigDir;

const config = require('../server/config');
const cfg = config.load();
cfg.port = 4777;
config.save(cfg);

let server;

describe('server', () => {
  before(async () => {
    const { createServer } = require('../server/index');
    server = await createServer(cfg);
  });

  after(() => {
    if (server) server.close();
    require('../server/pty-manager').closeAll();
  });

  it('rejects HTTP without token', async () => {
    const res = await fetch(`http://localhost:${cfg.port}/`);
    assert.strictEqual(res.status, 401);
  });

  it('serves SPA with valid token', async () => {
    const res = await fetch(`http://localhost:${cfg.port}/?token=${cfg.token}`);
    assert.strictEqual(res.status, 200);
  });

  it('accepts WebSocket with valid token and creates a PTY', async () => {
    const ws = new WebSocket(`ws://localhost:${cfg.port}/ws?token=${cfg.token}`);
    await new Promise((resolve) => ws.on('open', resolve));

    ws.send(JSON.stringify({ type: 'create', id: 'ws-test-1', cols: 80, rows: 24 }));

    const output = await new Promise((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'output' && msg.id === 'ws-test-1') resolve(msg);
      });
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input', id: 'ws-test-1', data: 'echo ws-ok\r' }));
      }, 200);
    });

    assert.strictEqual(output.type, 'output');
    ws.close();
  });

  it('rejects WebSocket upgrade without token', async () => {
    const ws = new WebSocket(`ws://localhost:${cfg.port}/ws`);
    const error = await new Promise((resolve) => {
      ws.on('error', resolve);
      ws.on('unexpected-response', (req, res) => resolve({ status: res.statusCode }));
    });
    assert.ok(error);
  });
});
