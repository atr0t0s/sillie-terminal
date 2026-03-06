#!/usr/bin/env node
const { execSync } = require('node:child_process');
const config = require('../server/config');
const launchd = require('../scripts/launchd');

const command = process.argv[2];

switch (command) {
  case 'install': {
    const cfg = config.load();
    launchd.install();
    const url = `http://127.0.0.1:${cfg.port}/?token=${cfg.token}`;
    execSync(`open "${url}"`);
    console.log('Sillie installed. Opens automatically on login.');
    console.log(`URL: ${url}`);
    break;
  }
  case 'uninstall':
    launchd.uninstall();
    console.log('Sillie uninstalled.');
    break;
  case 'start': {
    const cfg = config.load();
    const { createServer } = require('../server/index');
    createServer(cfg);
    break;
  }
  case 'stop':
    launchd.uninstall();
    launchd.install();
    console.log('Sillie restarted.');
    break;
  case 'status': {
    const cfg = config.load();
    const running = launchd.isRunning();
    console.log(`Status: ${running ? 'running' : 'stopped'}`);
    console.log(`Port: ${cfg.port}`);
    console.log(`URL: http://127.0.0.1:${cfg.port}/?token=${cfg.token}`);
    break;
  }
  case 'open': {
    const cfg = config.load();
    execSync(`open "http://127.0.0.1:${cfg.port}/?token=${cfg.token}"`);
    break;
  }
  default:
    console.log(`Usage: sillie <command>

Commands:
  install     Set up daemon and open browser
  uninstall   Remove daemon
  start       Start server (foreground)
  stop        Stop and restart daemon
  status      Show server status
  open        Open browser to Sillie`);
}
