import { useEffect } from 'react';

interface Actions {
  newTab: () => void;
  closeTab: () => void;
  selectTab: (index: number) => void;
  clearTerminal: () => void;
  splitHorizontal: () => void;
  splitVertical: () => void;
}

export function useKeyboardShortcuts(actions: Actions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey) return;

      switch (e.key) {
        case 't':
          e.preventDefault();
          actions.newTab();
          break;
        case 'w':
          e.preventDefault();
          actions.closeTab();
          break;
        case 'k':
          e.preventDefault();
          actions.clearTerminal();
          break;
        case 'd':
          e.preventDefault();
          if (e.shiftKey) {
            actions.splitVertical();
          } else {
            actions.splitHorizontal();
          }
          break;
        default:
          if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            actions.selectTab(parseInt(e.key) - 1);
          }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [actions]);
}
