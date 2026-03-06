const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');

// Mock node-pty since PTY spawning is not available in all environments
const mockProcs = [];
function createMockProc(cols, rows) {
  const emitter = new EventEmitter();
  const proc = {
    cols,
    rows,
    killed: false,
    _dataCallbacks: [],
    _exitCallbacks: [],
    onData(cb) { proc._dataCallbacks.push(cb); },
    onExit(cb) { proc._exitCallbacks.push(cb); },
    write(data) {
      // Echo back data to simulate shell output
      for (const cb of proc._dataCallbacks) cb(data);
    },
    resize(c, r) { proc.cols = c; proc.rows = r; },
    kill() { proc.killed = true; },
  };
  mockProcs.push(proc);
  return proc;
}

// Replace node-pty in require cache before loading pty-manager
const ptyMockModule = {
  spawn(file, args, opts) {
    return createMockProc(opts.cols, opts.rows);
  },
};
require.cache[require.resolve('node-pty')] = {
  id: require.resolve('node-pty'),
  filename: require.resolve('node-pty'),
  loaded: true,
  exports: ptyMockModule,
};

const ptyManager = require('../server/pty-manager');

describe('pty-manager', () => {
  after(() => { ptyManager.closeAll(); });

  it('creates a PTY session', () => {
    const session = ptyManager.create('test-1', { cols: 80, rows: 24 });
    assert.ok(session);
    assert.ok(ptyManager.get('test-1'));
  });

  it('returns existing session on duplicate create', () => {
    const s1 = ptyManager.create('test-dup', { cols: 80, rows: 24 });
    const s2 = ptyManager.create('test-dup', { cols: 100, rows: 40 });
    assert.strictEqual(s1, s2);
  });

  it('receives output from PTY via onData', () => {
    const output = [];
    ptyManager.create('test-output', {
      cols: 80, rows: 24,
      onData: (data) => output.push(data),
    });
    ptyManager.write('test-output', 'echo hello\r');
    assert.ok(output.join('').includes('hello'));
  });

  it('resizes a PTY session', () => {
    const session = ptyManager.create('test-resize', { cols: 80, rows: 24 });
    ptyManager.resize('test-resize', 120, 40);
    assert.strictEqual(session.cols, 120);
    assert.strictEqual(session.rows, 40);
  });

  it('closes a PTY session', () => {
    const session = ptyManager.create('test-close', { cols: 80, rows: 24 });
    ptyManager.close('test-close');
    assert.strictEqual(ptyManager.get('test-close'), undefined);
    assert.ok(session.killed);
  });

  it('lists active sessions', () => {
    ptyManager.create('test-list', { cols: 80, rows: 24 });
    assert.ok(ptyManager.listIds().includes('test-list'));
  });

  it('write and resize are no-ops for missing sessions', () => {
    // Should not throw
    ptyManager.write('nonexistent', 'data');
    ptyManager.resize('nonexistent', 80, 24);
    ptyManager.close('nonexistent');
  });
});
