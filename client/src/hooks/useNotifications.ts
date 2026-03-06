import { useEffect, useRef, useCallback } from 'react';

interface TabActivity {
  lastOutput: number;
  notified: boolean;
}

const IDLE_THRESHOLD_MS = 10_000; // 10s of no output = command finished

export function useNotifications(activeTabId: string) {
  const activityMap = useRef<Map<string, TabActivity>>(new Map());
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((p) => {
          permissionRef.current = p;
        });
      }
    }
  }, []);

  const recordOutput = useCallback((tabId: string) => {
    const entry = activityMap.current.get(tabId) || { lastOutput: 0, notified: false };
    entry.lastOutput = Date.now();
    entry.notified = false;
    activityMap.current.set(tabId, entry);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && permissionRef.current !== 'granted') return;

      const now = Date.now();
      activityMap.current.forEach((entry, tabId) => {
        if (tabId === activeTabId && !document.hidden) return;
        if (entry.notified) return;
        if (entry.lastOutput === 0) return;

        const idle = now - entry.lastOutput;
        if (idle > IDLE_THRESHOLD_MS) {
          entry.notified = true;
          if (permissionRef.current === 'granted') {
            new Notification('Sillie', {
              body: `Command finished in tab ${tabId}`,
              silent: false,
            });
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTabId]);

  const clearActivity = useCallback((tabId: string) => {
    activityMap.current.delete(tabId);
  }, []);

  return { recordOutput, clearActivity };
}
