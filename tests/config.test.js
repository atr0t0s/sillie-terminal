const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const testConfigDir = path.join(os.tmpdir(), 'sillie-test-' + Date.now());
process.env.SILLIE_CONFIG_DIR = testConfigDir;

const config = require('../server/config');

describe('config', () => {
  after(() => {
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  });

  it('creates default config with token when none exists', () => {
    const cfg = config.load();
    assert.strictEqual(cfg.port, 3777);
    assert.strictEqual(typeof cfg.token, 'string');
    assert.ok(cfg.token.length >= 32);
    assert.strictEqual(cfg.shell, process.env.SHELL || '/bin/zsh');
  });

  it('persists config to disk', () => {
    const cfg = config.load();
    const raw = fs.readFileSync(config.configPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.token, cfg.token);
  });

  it('reloads existing config without overwriting token', () => {
    const cfg1 = config.load();
    const cfg2 = config.load();
    assert.strictEqual(cfg1.token, cfg2.token);
  });
});
