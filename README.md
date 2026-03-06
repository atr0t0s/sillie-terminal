# sillie

A terminal in your browser. Runs a local Node.js server that spawns real PTY sessions and pipes them to a React + xterm.js frontend over WebSockets.

## Why

Sometimes you want a terminal that lives in a browser tab. Maybe you're on a machine where the native terminal is limited, or you want tabs and splits without tmux, or you just like the idea. Sillie does that with minimal setup.

## What you get

- Real shell sessions (zsh, bash, whatever you use) via node-pty
- Tabs, split panes (horizontal and vertical), and per-tab pane trees
- WebGL-accelerated rendering, ligatures, image protocol support, clickable links
- Find-in-terminal search
- 8 built-in color themes (Tokyo Night, Dracula, Catppuccin Mocha, Gruvbox, Nord, Kanagawa, Solarized Dark, One Dark)
- Broadcast mode - type in one pane, input goes to all panes in the tab
- Session persistence - disconnect and reconnect without losing scrollback
- Token-based auth so it's not just open on localhost
- macOS launchd integration - runs on login, stays alive

## Install

```
npm install -g @atrotos/sillie
```

Requires Node 18+. The `node-pty` dependency needs a C++ toolchain (Xcode command line tools on macOS).

## Quick start

```
sillie install
```

This does three things: generates a config with a random auth token, registers a launchd daemon, and opens the terminal in your browser.

The server listens on `127.0.0.1:3777` by default. It's localhost-only.

## CLI

```
sillie install      # set up daemon, open browser
sillie uninstall    # remove daemon
sillie start        # run server in foreground (no daemon)
sillie stop         # restart the daemon
sillie status       # show whether it's running, port, URL
sillie open         # open browser to your sillie instance
```

## Keyboard shortcuts

All shortcuts use `Ctrl+Shift` to avoid stepping on terminal sequences (Ctrl+C, Ctrl+D, etc.) or browser defaults.

| Shortcut | Action |
|---|---|
| Ctrl+Shift+T | New tab |
| Ctrl+Shift+W | Close tab |
| Ctrl+Shift+1-9 | Switch to tab N |
| Ctrl+Shift+D | Split pane down |
| Ctrl+Shift+E | Split pane right |
| Ctrl+Shift+K | Clear terminal |
| Ctrl+Shift+F | Find in terminal |
| Ctrl+Shift+B | Toggle broadcast mode |
| Ctrl+Shift+, | Settings |
| Ctrl+Shift+= | Zoom in |
| Ctrl+Shift+- | Zoom out |
| Ctrl+Shift+0 | Reset zoom |

## Config

Stored at `~/.config/sillie/config.json`. Created on first run.

```json
{
  "port": 3777,
  "token": "auto-generated hex string",
  "shell": "/bin/zsh",
  "theme": {
    "fontFamily": "monospace",
    "fontSize": 14,
    "background": "#1a1b26",
    "foreground": "#c0caf5"
  }
}
```

You can also change theme, font, and font size from the settings modal in the UI.

## Development

```bash
# install dependencies
npm install
cd client && npm install && cd ..

# run server and client dev server in separate terminals
npm run dev:server
npm run dev:client
```

The Vite dev server proxies WebSocket connections to the backend. The server runs on port 3777, Vite on whatever it picks (usually 5173).

```bash
# run tests
npm test

# build the client for production
npm run build:client
```

## How it works

The server is Express + ws. When a WebSocket connects, the client can send `create`, `input`, `resize`, and `close` messages. Each `create` spawns a node-pty process. Output flows back as `output` messages. If the WebSocket disconnects, PTY sessions stay alive and buffer scrollback for reconnection.

The frontend is React with xterm.js. Each terminal pane gets its own xterm instance with WebGL rendering. The pane tree is a recursive split structure - you can nest splits arbitrarily.

Auth is a token passed as a query parameter. The token is generated once and saved in the config file.

## License

MIT
