import { useState, useRef, useCallback, ReactNode } from 'react';

interface SplitPaneProps {
  direction: 'horizontal' | 'vertical';
  children: [ReactNode, ReactNode];
  initialRatio?: number;
}

export default function SplitPane({ direction, children, initialRatio = 0.5 }: SplitPaneProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const onMouseMove = (e: MouseEvent) => {
      const pos = direction === 'horizontal'
        ? (e.clientY - rect.top) / rect.height
        : (e.clientX - rect.left) / rect.width;
      setRatio(Math.min(0.9, Math.max(0.1, pos)));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [direction]);

  const isHoriz = direction === 'horizontal';

  return (
    <div ref={containerRef} style={{
      display: 'flex',
      flexDirection: isHoriz ? 'column' : 'row',
      width: '100%',
      height: '100%',
    }}>
      <div style={{ [isHoriz ? 'height' : 'width']: `${ratio * 100}%`, overflow: 'hidden' }}>
        {children[0]}
      </div>
      <div
        onMouseDown={onMouseDown}
        style={{
          [isHoriz ? 'height' : 'width']: 4,
          background: '#2a2b36',
          cursor: isHoriz ? 'row-resize' : 'col-resize',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children[1]}
      </div>
    </div>
  );
}
