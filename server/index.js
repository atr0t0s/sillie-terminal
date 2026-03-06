const express = require('express');
const http = require('node:http');
const { WebSocketServer } = require('ws');
const path = require('node:path');
const auth = require('./auth');
const ptyManager = require('./pty-manager');

function createServer(cfg) {
  const app = express();

  app.use((req, res, next) => {
    if (auth.validateRequest(req.url, cfg.token)) {
      next();
    } else {
      res.status(401).send('Unauthorized — token required');
    }
  });

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (!auth.validateRequest(req.url, cfg.token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.type) {
        case 'create':
          ptyManager.create(msg.id, {
            cols: msg.cols || 80,
            rows: msg.rows || 24,
            shell: cfg.shell,
            onData: (data) => {
              if (ws.readyState === ws.OPEN)
                ws.send(JSON.stringify({ type: 'output', id: msg.id, data }));
            },
            onExit: ({ exitCode }) => {
              if (ws.readyState === ws.OPEN)
                ws.send(JSON.stringify({ type: 'exit', id: msg.id, code: exitCode }));
              ptyManager.close(msg.id);
            },
          });
          break;
        case 'input':
          ptyManager.write(msg.id, msg.data);
          break;
        case 'resize':
          ptyManager.resize(msg.id, msg.cols, msg.rows);
          break;
        case 'close':
          ptyManager.close(msg.id);
          break;
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(cfg.port, '127.0.0.1', () => {
      console.log(`Sillie server listening on http://127.0.0.1:${cfg.port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  const config = require('./config');
  const cfg = config.load();
  createServer(cfg);
}

module.exports = { createServer };
