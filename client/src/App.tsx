import { useState, useCallback, useRef, useMemo, createRef } from 'react';
import TabBar, { Tab } from './components/TabBar';
import Terminal, { TerminalHandle } from './components/Terminal';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

let nextId = 1;
function genId() { return `t${nextId++}`; }

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const id = genId();
    return [{ id, title: 'Terminal' }];
  });
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const termRefs = useRef<Map<string, React.RefObject<TerminalHandle | null>>>(new Map());

  const getTermRef = (id: string) => {
    if (!termRefs.current.has(id)) {
      termRefs.current.set(id, createRef<TerminalHandle>());
    }
    return termRefs.current.get(id)!;
  };

  const onMessage = useCallback((msg: any) => {
    if (msg.type === 'output') {
      const ref = termRefs.current.get(msg.id);
      if (ref?.current) ref.current.write(msg.data);
    }
  }, []);

  const { send } = useWebSocket(onMessage);

  const addTab = useCallback(() => {
    const id = genId();
    setTabs((prev) => [...prev, { id, title: 'Terminal' }]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback((id?: string) => {
    const closeId = id || activeTabId;
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== closeId);
      if (next.length === 0) {
        const newId = genId();
        setActiveTabId(newId);
        return [{ id: newId, title: 'Terminal' }];
      }
      if (closeId === activeTabId) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
    send({ type: 'close', id: closeId });
    termRefs.current.delete(closeId);
  }, [activeTabId, send]);

  const shortcuts = useMemo(() => ({
    newTab: addTab,
    closeTab: () => closeTab(),
    selectTab: (idx: number) => {
      setTabs((prev) => {
        if (idx < prev.length) setActiveTabId(prev[idx].id);
        return prev;
      });
    },
    clearTerminal: () => {
      const ref = termRefs.current.get(activeTabId);
      if (ref?.current) ref.current.clear();
    },
  }), [addTab, closeTab, activeTabId]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={(id) => closeTab(id)}
        onNew={addTab}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              position: 'absolute',
              inset: 0,
              display: tab.id === activeTabId ? 'block' : 'none',
            }}
          >
            <Terminal
              ref={getTermRef(tab.id)}
              id={tab.id}
              send={send}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
