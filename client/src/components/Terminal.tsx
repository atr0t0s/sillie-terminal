import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export interface TerminalHandle {
  write: (data: string) => void;
  clear: () => void;
  focus: () => void;
}

interface Props {
  id: string;
  send: (msg: object) => void;
  theme?: {
    fontFamily?: string;
    fontSize?: number;
    background?: string;
    foreground?: string;
  };
}

const Terminal = forwardRef<TerminalHandle, Props>(({ id, send, theme }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useImperativeHandle(ref, () => ({
    write: (data: string) => termRef.current?.write(data),
    clear: () => termRef.current?.clear(),
    focus: () => termRef.current?.focus(),
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontFamily: theme?.fontFamily || 'monospace',
      fontSize: theme?.fontSize || 14,
      theme: {
        background: theme?.background || '#1a1b26',
        foreground: theme?.foreground || '#c0caf5',
      },
      cursorBlink: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    send({ type: 'create', id, cols: term.cols, rows: term.rows });

    term.onData((data) => {
      send({ type: 'input', id, data });
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

Terminal.displayName = 'Terminal';
export default Terminal;
