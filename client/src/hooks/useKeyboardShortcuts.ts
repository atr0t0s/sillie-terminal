import { useEffect } from 'react';

interface Actions {
  newTab: () => void;
  closeTab: () => void;
  selectTab: (index: number) => void;
  clearTerminal: () => void;
  splitHorizontal: () => void;
  splitVertical: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleSearch: () => void;
  openSettings: () => void;
  toggleBroadcast: () => void;
}

// All shortcuts use Ctrl+Shift to avoid conflicts with:
// - browser shortcuts (Cmd/Ctrl)
// - terminal control sequences (Ctrl+C, Ctrl+D, etc.)
export function useKeyboardShortcuts(actions: Actions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      // Ignore if meta is also held
      if (e.metaKey) return;

      switch (e.key) {
        case 'T':
          e.preventDefault();
          actions.newTab();
          break;
        case 'W':
          e.preventDefault();
          actions.closeTab();
          break;
        case 'K':
          e.preventDefault();
          actions.clearTerminal();
          break;
        case 'D':
          e.preventDefault();
          actions.splitHorizontal();
          break;
        case 'E':
          e.preventDefault();
          actions.splitVertical();
          break;
        case 'F':
          e.preventDefault();
          actions.toggleSearch();
          break;
        case ',':
        case '<':
          e.preventDefault();
          actions.openSettings();
          break;
        case 'B':
          e.preventDefault();
          actions.toggleBroadcast();
          break;
        case '+':
        case '=':
          e.preventDefault();
          actions.zoomIn();
          break;
        case '_':
        case '-':
          e.preventDefault();
          actions.zoomOut();
          break;
        case ')':
        case '0':
          e.preventDefault();
          actions.resetZoom();
          break;
        default:
          if (e.key >= '!' && e.key <= '(' || (e.code >= 'Digit1' && e.code <= 'Digit9')) {
            // Ctrl+Shift+1-9 — key values vary by keyboard layout, use code
            const match = e.code.match(/^Digit(\d)$/);
            if (match) {
              e.preventDefault();
              actions.selectTab(parseInt(match[1]) - 1);
            }
          }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [actions]);
}
