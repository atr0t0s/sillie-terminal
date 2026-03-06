const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const CONFIG_DIR = process.env.SILLIE_CONFIG_DIR ||
  path.join(os.homedir(), '.config', 'sillie');
const CONFIG_FILE = 'config.json';

function configPath() {
  return path.join(CONFIG_DIR, CONFIG_FILE);
}

function defaults() {
  return {
    port: 3777,
    token: crypto.randomBytes(24).toString('hex'),
    shell: process.env.SHELL || '/bin/zsh',
    theme: {
      fontFamily: 'monospace',
      fontSize: 14,
      background: '#1a1b26',
      foreground: '#c0caf5',
    },
  };
}

function load() {
  const filePath = configPath();
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const saved = JSON.parse(raw);
    return { ...defaults(), ...saved };
  }
  const cfg = defaults();
  save(cfg);
  return cfg;
}

function save(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
}

module.exports = { load, save, configPath };
