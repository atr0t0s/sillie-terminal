import { useState, useCallback, useRef, useMemo, createRef } from 'react';
import TabBar, { Tab } from './components/TabBar';
import Terminal, { TerminalHandle } from './components/Terminal';
import SplitPane from './components/SplitPane';
import SearchBar from './components/SearchBar';
import ContextMenu from './components/ContextMenu';
import SettingsModal from './components/SettingsModal';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotifications } from './hooks/useNotifications';
import { themes, defaultThemeName } from './themes';

let nextId = 1;
function genId() { return `t${nextId++}`; }

// Pane tree: either a terminal leaf or a split node
type PaneLeaf = { type: 'leaf'; id: string };
type PaneSplit = { type: 'split'; direction: 'horizontal' | 'vertical'; children: [PaneNode, PaneNode] };
type PaneNode = PaneLeaf | PaneSplit;

function findLeafIds(node: PaneNode): string[] {
  if (node.type === 'leaf') return [node.id];
  return [...findLeafIds(node.children[0]), ...findLeafIds(node.children[1])];
}

function replaceLeaf(node: PaneNode, targetId: string, replacement: PaneNode): PaneNode {
  if (node.type === 'leaf') {
    return node.id === targetId ? replacement : node;
  }
  return {
    ...node,
    children: [
      replaceLeaf(node.children[0], targetId, replacement),
      replaceLeaf(node.children[1], targetId, replacement),
    ],
  };
}

function removeLeaf(node: PaneNode, targetId: string): PaneNode | null {
  if (node.type === 'leaf') {
    return node.id === targetId ? null : node;
  }
  const left = removeLeaf(node.children[0], targetId);
  const right = removeLeaf(node.children[1], targetId);
  if (!left) return right;
  if (!right) return left;
  return { ...node, children: [left, right] };
}

interface Settings {
  themeName: string;
  fontFamily: string;
  fontSize: number;
  broadcastInput: boolean;
}

const defaultSettings: Settings = {
  themeName: defaultThemeName,
  fontFamily: '"FiraCode Nerd Font", "Fira Code", monospace',
  fontSize: 14,
  broadcastInput: false,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('sillie-settings');
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(s: Settings) {
  localStorage.setItem('sillie-settings', JSON.stringify(s));
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const id = genId();
    return [{ id, title: 'Terminal' }];
  });
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [paneTree, setPaneTree] = useState<Record<string, PaneNode>>(() => {
    const id = tabs[0].id;
    return { [id]: { type: 'leaf', id } };
  });
  const [focusedPaneId, setFocusedPaneId] = useState(tabs[0].id);
  const [searchVisible, setSearchVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const termRefs = useRef<Map<string, React.RefObject<TerminalHandle | null>>>(new Map());
  const { recordOutput, clearActivity } = useNotifications(activeTabId);

  const getTermRef = (id: string) => {
    if (!termRefs.current.has(id)) {
      termRefs.current.set(id, createRef<TerminalHandle>());
    }
    return termRefs.current.get(id)!;
  };

  const activeTheme = themes[settings.themeName] || themes[defaultThemeName];

  const onMessage = useCallback((msg: any) => {
    if (msg.type === 'output') {
      const ref = termRefs.current.get(msg.id);
      if (ref?.current) ref.current.write(msg.data);
      recordOutput(msg.id);
    }
    if (msg.type === 'title') {
      setTabs((prev) => prev.map((t) => {
        // Find which tab contains this pane id
        return t;
      }));
    }
  }, [recordOutput]);

  const { send, connected } = useWebSocket(onMessage);

  // Wrap send to support broadcast input
  const sendWrapped = useCallback((msg: object) => {
    if (settings.broadcastInput && (msg as any).type === 'input') {
      // Send to all terminals in the active tab
      const tree = paneTree[activeTabId];
      if (tree) {
        const ids = findLeafIds(tree);
        ids.forEach((id) => {
          send({ ...(msg as any), id });
        });
        return;
      }
    }
    send(msg);
  }, [send, settings.broadcastInput, paneTree, activeTabId]);

  const addTab = useCallback(() => {
    const id = genId();
    setTabs((prev) => [...prev, { id, title: 'Terminal' }]);
    setPaneTree((prev) => ({ ...prev, [id]: { type: 'leaf', id } }));
    setActiveTabId(id);
    setFocusedPaneId(id);
  }, []);

  const closeTab = useCallback((id?: string) => {
    const closeId = id || activeTabId;
    // Close all PTYs in this tab's pane tree
    const tree = paneTree[closeId];
    if (tree) {
      const ids = findLeafIds(tree);
      ids.forEach((pid) => {
        send({ type: 'close', id: pid });
        termRefs.current.delete(pid);
        clearActivity(pid);
      });
    }

    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== closeId);
      if (next.length === 0) {
        const newId = genId();
        setActiveTabId(newId);
        setFocusedPaneId(newId);
        setPaneTree((p) => {
          const { [closeId]: _, ...rest } = p;
          return { ...rest, [newId]: { type: 'leaf', id: newId } };
        });
        return [{ id: newId, title: 'Terminal' }];
      }
      if (closeId === activeTabId) {
        const newActive = next[next.length - 1].id;
        setActiveTabId(newActive);
        const newTree = paneTree[newActive];
        if (newTree) setFocusedPaneId(findLeafIds(newTree)[0]);
      }
      setPaneTree((p) => {
        const { [closeId]: _, ...rest } = p;
        return rest;
      });
      return next;
    });
  }, [activeTabId, send, paneTree, clearActivity]);

  const splitPane = useCallback((direction: 'horizontal' | 'vertical') => {
    const newId = genId();
    const tree = paneTree[activeTabId];
    if (!tree) return;

    const newTree = replaceLeaf(tree, focusedPaneId, {
      type: 'split',
      direction,
      children: [
        { type: 'leaf', id: focusedPaneId },
        { type: 'leaf', id: newId },
      ],
    });
    setPaneTree((prev) => ({ ...prev, [activeTabId]: newTree }));
    setFocusedPaneId(newId);
  }, [activeTabId, focusedPaneId, paneTree]);

  const closeSplitPane = useCallback((paneId: string) => {
    const tree = paneTree[activeTabId];
    if (!tree) return;
    const ids = findLeafIds(tree);
    if (ids.length <= 1) return; // Don't remove the last pane

    send({ type: 'close', id: paneId });
    termRefs.current.delete(paneId);
    clearActivity(paneId);

    const newTree = removeLeaf(tree, paneId);
    if (newTree) {
      setPaneTree((prev) => ({ ...prev, [activeTabId]: newTree }));
      if (focusedPaneId === paneId) {
        setFocusedPaneId(findLeafIds(newTree)[0]);
      }
    }
  }, [activeTabId, focusedPaneId, paneTree, send, clearActivity]);

  const handleTitleChange = useCallback((paneId: string, title: string) => {
    // Update the tab title to match the focused pane's title
    setTabs((prev) => prev.map((tab) => {
      const tree = paneTree[tab.id];
      if (tree && findLeafIds(tree).includes(paneId)) {
        // Only update if this pane is focused
        if (paneId === focusedPaneId) {
          return { ...tab, title: title || 'Terminal' };
        }
      }
      return tab;
    }));
  }, [paneTree, focusedPaneId]);

  const handleSettingsSave = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const shortcuts = useMemo(() => ({
    newTab: addTab,
    closeTab: () => closeTab(),
    selectTab: (idx: number) => {
      setTabs((prev) => {
        if (idx < prev.length) {
          setActiveTabId(prev[idx].id);
          const tree = paneTree[prev[idx].id];
          if (tree) setFocusedPaneId(findLeafIds(tree)[0]);
        }
        return prev;
      });
    },
    clearTerminal: () => {
      const ref = termRefs.current.get(focusedPaneId);
      if (ref?.current) ref.current.clear();
    },
    splitHorizontal: () => splitPane('horizontal'),
    splitVertical: () => splitPane('vertical'),
    zoomIn: () => {
      const ref = termRefs.current.get(focusedPaneId);
      if (ref?.current) ref.current.zoomIn();
    },
    zoomOut: () => {
      const ref = termRefs.current.get(focusedPaneId);
      if (ref?.current) ref.current.zoomOut();
    },
    resetZoom: () => {
      const ref = termRefs.current.get(focusedPaneId);
      if (ref?.current) ref.current.resetZoom();
    },
    toggleSearch: () => setSearchVisible((v) => !v),
    openSettings: () => setSettingsOpen(true),
    toggleBroadcast: () => {
      setSettings((prev) => {
        const next = { ...prev, broadcastInput: !prev.broadcastInput };
        saveSettings(next);
        return next;
      });
    },
  }), [addTab, closeTab, focusedPaneId, splitPane, paneTree]);

  useKeyboardShortcuts(shortcuts);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const contextMenuItems = useMemo(() => [
    { label: 'Copy', shortcut: 'Ctrl+Shift+C', action: () => {
      const sel = window.getSelection()?.toString();
      if (sel) navigator.clipboard.writeText(sel);
    }},
    { label: 'Paste', shortcut: 'Ctrl+Shift+V', action: () => navigator.clipboard.readText().then((text) => {
      send({ type: 'input', id: focusedPaneId, data: text });
    })},
    { separator: true as const },
    { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => setSearchVisible(true) },
    { label: 'Clear', shortcut: 'Ctrl+Shift+K', action: () => {
      const ref = termRefs.current.get(focusedPaneId);
      if (ref?.current) ref.current.clear();
    }},
    { separator: true as const },
    { label: 'Split Down', shortcut: 'Ctrl+Shift+D', action: () => splitPane('horizontal') },
    { label: 'Split Right', shortcut: 'Ctrl+Shift+E', action: () => splitPane('vertical') },
    { separator: true as const },
    { label: 'New Tab', shortcut: 'Ctrl+Shift+T', action: addTab },
    { label: 'Settings', shortcut: 'Ctrl+Shift+<', action: () => setSettingsOpen(true) },
  ], [focusedPaneId, send, splitPane, addTab]);

  function renderPaneTree(node: PaneNode, tabId: string): React.ReactNode {
    if (node.type === 'leaf') {
      return (
        <div
          style={{ width: '100%', height: '100%' }}
          onMouseDown={() => setFocusedPaneId(node.id)}
          onContextMenu={handleContextMenu}
        >
          <Terminal
            ref={getTermRef(node.id)}
            id={node.id}
            send={sendWrapped}
            connected={connected}
            fontFamily={settings.fontFamily}
            fontSize={settings.fontSize}
            theme={activeTheme}
            onTitleChange={(title) => handleTitleChange(node.id, title)}
          />
        </div>
      );
    }
    return (
      <SplitPane direction={node.direction}>
        {[
          renderPaneTree(node.children[0], tabId),
          renderPaneTree(node.children[1], tabId),
        ] as [React.ReactNode, React.ReactNode]}
      </SplitPane>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: activeTheme.background }}>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={(id) => {
          setActiveTabId(id);
          const tree = paneTree[id];
          if (tree) setFocusedPaneId(findLeafIds(tree)[0]);
        }}
        onClose={(id) => closeTab(id)}
        onNew={addTab}
      />

      {settings.broadcastInput && (
        <div style={{
          background: '#f7768e',
          color: '#1a1b26',
          fontSize: 11,
          fontWeight: 600,
          textAlign: 'center',
          padding: '2px 0',
          userSelect: 'none',
        }}>
          BROADCAST MODE (Ctrl+Shift+B to toggle)
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              position: 'absolute',
              inset: 0,
              display: tab.id === activeTabId ? 'flex' : 'none',
            }}
          >
            {paneTree[tab.id] && renderPaneTree(paneTree[tab.id], tab.id)}
          </div>
        ))}

        <SearchBar
          visible={searchVisible}
          onFindNext={(q) => {
            const ref = termRefs.current.get(focusedPaneId);
            if (ref?.current) ref.current.findNext(q);
          }}
          onFindPrevious={(q) => {
            const ref = termRefs.current.get(focusedPaneId);
            if (ref?.current) ref.current.findPrevious(q);
          }}
          onClose={() => {
            setSearchVisible(false);
            const ref = termRefs.current.get(focusedPaneId);
            if (ref?.current) {
              ref.current.clearSearch();
              ref.current.focus();
            }
          }}
        />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
