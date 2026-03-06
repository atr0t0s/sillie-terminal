import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { ImageAddon } from '@xterm/addon-image';
import '@xterm/xterm/css/xterm.css';
import { TerminalTheme } from '../themes';

export interface TerminalHandle {
  write: (data: string) => void;
  clear: () => void;
  focus: () => void;
  findNext: (query: string) => boolean;
  findPrevious: (query: string) => boolean;
  clearSearch: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getFontSize: () => number;
}

interface Props {
  id: string;
  send: (msg: object) => void;
  connected: boolean;
  fontFamily?: string;
  fontSize?: number;
  theme?: TerminalTheme;
  onTitleChange?: (title: string) => void;
}

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;

const Terminal = forwardRef<TerminalHandle, Props>(({ id, send, connected, fontFamily, fontSize = 14, theme, onTitleChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const fontSizeRef = useRef(fontSize);

  useImperativeHandle(ref, () => ({
    write: (data: string) => termRef.current?.write(data),
    clear: () => termRef.current?.clear(),
    focus: () => termRef.current?.focus(),
    findNext: (query: string) => searchRef.current?.findNext(query) ?? false,
    findPrevious: (query: string) => searchRef.current?.findPrevious(query) ?? false,
    clearSearch: () => searchRef.current?.clearDecorations(),
    zoomIn: () => {
      if (termRef.current && fontSizeRef.current < MAX_FONT_SIZE) {
        fontSizeRef.current = Math.min(MAX_FONT_SIZE, fontSizeRef.current + 1);
        termRef.current.options.fontSize = fontSizeRef.current;
        fitRef.current?.fit();
      }
    },
    zoomOut: () => {
      if (termRef.current && fontSizeRef.current > MIN_FONT_SIZE) {
        fontSizeRef.current = Math.max(MIN_FONT_SIZE, fontSizeRef.current - 1);
        termRef.current.options.fontSize = fontSizeRef.current;
        fitRef.current?.fit();
      }
    },
    resetZoom: () => {
      if (termRef.current) {
        fontSizeRef.current = fontSize;
        termRef.current.options.fontSize = fontSize;
        fitRef.current?.fit();
      }
    },
    getFontSize: () => fontSizeRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontFamily: fontFamily || '"FiraCode Nerd Font", "Fira Code", monospace',
      fontSize: fontSizeRef.current,
      theme: theme ? {
        background: theme.background,
        foreground: theme.foreground,
        cursor: theme.cursor,
        cursorAccent: theme.cursorAccent,
        selectionBackground: theme.selectionBackground,
        black: theme.black,
        red: theme.red,
        green: theme.green,
        yellow: theme.yellow,
        blue: theme.blue,
        magenta: theme.magenta,
        cyan: theme.cyan,
        white: theme.white,
        brightBlack: theme.brightBlack,
        brightRed: theme.brightRed,
        brightGreen: theme.brightGreen,
        brightYellow: theme.brightYellow,
        brightBlue: theme.brightBlue,
        brightMagenta: theme.brightMagenta,
        brightCyan: theme.brightCyan,
        brightWhite: theme.brightWhite,
      } : {
        background: '#1a1b26',
        foreground: '#c0caf5',
      },
      cursorBlink: true,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    const search = new SearchAddon();
    const webLinks = new WebLinksAddon();
    const image = new ImageAddon();

    term.loadAddon(fit);
    term.loadAddon(search);
    term.loadAddon(webLinks);
    term.loadAddon(image);
    term.open(containerRef.current);

    // WebGL addon must be loaded after open()
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      term.loadAddon(webgl);
    } catch {
      // WebGL not available, fallback to canvas renderer
    }

    fit.fit();

    termRef.current = term;
    fitRef.current = fit;
    searchRef.current = search;

    term.onData((data) => {
      send({ type: 'input', id, data });
    });

    term.onTitleChange((title) => {
      onTitleChange?.(title);
    });

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
      send({ type: 'resize', id, cols: term.cols, rows: term.rows });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      send({ type: 'close', id });
    };
  }, [id]);

  // Update theme without re-creating terminal
  useEffect(() => {
    if (termRef.current && theme) {
      termRef.current.options.theme = {
        background: theme.background,
        foreground: theme.foreground,
        cursor: theme.cursor,
        cursorAccent: theme.cursorAccent,
        selectionBackground: theme.selectionBackground,
        black: theme.black,
        red: theme.red,
        green: theme.green,
        yellow: theme.yellow,
        blue: theme.blue,
        magenta: theme.magenta,
        cyan: theme.cyan,
        white: theme.white,
        brightBlack: theme.brightBlack,
        brightRed: theme.brightRed,
        brightGreen: theme.brightGreen,
        brightYellow: theme.brightYellow,
        brightBlue: theme.brightBlue,
        brightMagenta: theme.brightMagenta,
        brightCyan: theme.brightCyan,
        brightWhite: theme.brightWhite,
      };
    }
  }, [theme]);

  // Create PTY once WebSocket is connected
  useEffect(() => {
    if (connected && termRef.current) {
      send({ type: 'create', id, cols: termRef.current.cols, rows: termRef.current.rows });
    }
  }, [connected, id]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

Terminal.displayName = 'Terminal';
export default Terminal;
