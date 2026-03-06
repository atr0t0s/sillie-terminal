import { useEffect, useRef } from 'react';

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  separator?: false;
}

interface Separator {
  separator: true;
}

type Item = MenuItem | Separator;

interface Props {
  x: number;
  y: number;
  items: Item[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 100,
        background: '#2a2b36',
        border: '1px solid #3b3d4a',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        padding: '4px 0',
        minWidth: 180,
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} style={{ height: 1, background: '#3b3d4a', margin: '4px 0' }} />;
        }
        return (
          <div
            key={i}
            onClick={() => { item.action(); onClose(); }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b3d4a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 16px',
              color: '#c0caf5',
              fontSize: 13,
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span style={{ color: '#7a7e8a', fontSize: 12, marginLeft: 24 }}>{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
}
