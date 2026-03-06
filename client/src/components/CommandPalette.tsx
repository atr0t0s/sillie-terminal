import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Command, fuzzySearch } from '../commands';

interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ commands, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query ? fuzzySearch(commands, query) : commands;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const execute = useCallback(
    (cmd: Command) => {
      onClose();
      cmd.action();
    },
    [onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : i));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        execute(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 300,
        display: 'flex',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          marginTop: '15vh',
          width: 500,
          maxHeight: 420,
          background: '#1e1f2e',
          border: '1px solid #3b3d4a',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'flex-start',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          style={{
            background: '#1a1b26',
            border: 'none',
            borderBottom: '1px solid #3b3d4a',
            color: '#c0caf5',
            padding: '12px 16px',
            fontSize: 14,
            outline: 'none',
            borderRadius: '10px 10px 0 0',
          }}
        />
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            maxHeight: 360,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '8px 16px',
                fontSize: 13,
                color: '#7a7e8a',
              }}
            >
              No matching commands
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.id ?? i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  fontSize: 13,
                  color: '#c0caf5',
                  background: i === selectedIndex ? '#2a2d3a' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => execute(cmd)}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <span style={{ color: '#7a7e8a', fontSize: 11 }}>
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
