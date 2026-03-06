import { useState, useRef, useEffect } from 'react';

interface Props {
  visible: boolean;
  onFindNext: (query: string) => void;
  onFindPrevious: (query: string) => void;
  onClose: () => void;
}

export default function SearchBar({ visible, onFindNext, onFindPrevious, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onFindPrevious(query);
      else onFindNext(query);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 16,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: '#2a2b36',
      borderRadius: '0 0 6px 6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        style={{
          background: '#1a1b26',
          border: '1px solid #3b3d4a',
          borderRadius: 4,
          color: '#c0caf5',
          padding: '3px 8px',
          fontSize: 13,
          outline: 'none',
          width: 200,
        }}
      />
      <button onClick={() => onFindPrevious(query)} style={btnStyle} title="Previous (Shift+Enter)">&#9650;</button>
      <button onClick={() => onFindNext(query)} style={btnStyle} title="Next (Enter)">&#9660;</button>
      <button onClick={onClose} style={btnStyle} title="Close (Esc)">&#10005;</button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#7a7e8a',
  cursor: 'pointer',
  fontSize: 12,
  padding: '2px 4px',
};
