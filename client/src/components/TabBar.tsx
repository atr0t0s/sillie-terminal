export interface Tab {
  id: string;
  title: string;
}

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onNew }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#13141b',
      height: 36,
      paddingLeft: 8,
      gap: 2,
      userSelect: 'none',
    }}>
      <button
        onClick={onNew}
        style={{
          background: 'none',
          border: 'none',
          color: '#7a7e8a',
          fontSize: 18,
          cursor: 'pointer',
          padding: '4px 8px',
        }}
      >+</button>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: tab.id === activeTabId ? '#1a1b26' : 'transparent',
            color: tab.id === activeTabId ? '#c0caf5' : '#7a7e8a',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <span>{tab.title}</span>
          {tabs.length > 1 && (
            <span
              onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
              style={{ cursor: 'pointer', opacity: 0.5, fontSize: 11 }}
            >x</span>
          )}
        </div>
      ))}
    </div>
  );
}
