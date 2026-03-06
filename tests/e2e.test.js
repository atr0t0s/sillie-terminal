const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { WebSocket } = require('ws');
const path = require('node:path');
const os = require('node:os');

// Mock node-pty to avoid real PTY spawn issues in test environments
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

const testConfigDir = path.join(os.tmpdir(), 'sillie-e2e-' + Date.now());
process.env.SILLIE_CONFIG_DIR = testConfigDir;

const config = require('../server/config');
const cfg = config.load();
cfg.port = 4999;
config.save(cfg);

let server;

describe('e2e', () => {
  before(async () => {
    const { createServer } = require('../server/index');
    server = await createServer(cfg);
  });

  after(async () => {
    require('../server/pty-manager').closeAll();
    if (server) await new Promise((r) => server.close(r));
  });

  it('creates terminal, runs command, gets output', { timeout: 10000 }, async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${cfg.port}/ws?token=${cfg.token}`);
    await new Promise((r) => ws.on('open', r));

    ws.send(JSON.stringify({ type: 'create', id: 'e2e-1', cols: 80, rows: 24 }));

    const output = await new Promise((resolve) => {
      let buf = '';
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'output' && msg.id === 'e2e-1') {
          buf += msg.data;
          if (buf.includes('SILLIE_OK')) resolve(buf);
        }
      });
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input', id: 'e2e-1', data: 'echo SILLIE_OK\r' }));
      }, 300);
    });

    assert.ok(output.includes('SILLIE_OK'));
    ws.close();
  });
});
