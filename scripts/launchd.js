const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const PLIST_NAME = 'com.sillie.server';
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', PLIST_NAME + '.plist');

function plistContent() {
  const nodePath = process.execPath;
  const serverScript = path.join(__dirname, '..', 'server', 'index.js');
  const logPath = path.join(os.homedir(), '.config', 'sillie', 'sillie.log');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_NAME}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${serverScript}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
</dict>
</plist>`;
}

function install() {
  fs.writeFileSync(PLIST_PATH, plistContent());
  execSync(`launchctl load ${PLIST_PATH}`);
}

function uninstall() {
  try { execSync(`launchctl unload ${PLIST_PATH}`); } catch {}
  if (fs.existsSync(PLIST_PATH)) fs.unlinkSync(PLIST_PATH);
}

function isRunning() {
  try {
    const out = execSync(`launchctl list ${PLIST_NAME} 2>/dev/null`).toString();
    return !out.includes('Could not find');
  } catch {
    return false;
  }
}

module.exports = { install, uninstall, isRunning, PLIST_PATH };
