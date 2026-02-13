import { writable, get, type Writable } from 'svelte/store';
import { type WinConfig } from '../types';

// Store state interface
interface WindowsState {
  winConfigs: WinConfig[];
  windowOrder: string[];
  activeWindowId: string | null;
  dropTargetId: string | null;  // window id being hovered for tab merge
}

// Initial state
const initialState: WindowsState = {
  winConfigs: [],
  windowOrder: [],
  activeWindowId: null,
  dropTargetId: null
};

// Create the store
export const WindowsStore: Writable<WindowsState> = writable(initialState);

// Exported functions

export function registerWindow(windowId: string, config: WinConfig): void {
  WindowsStore.update(store => {
    if (store.winConfigs.find(w => w.id === windowId)) {
      console.warn(`Window ${windowId} already registered`);
      return store;
    }

    return {
      ...store,
      winConfigs: [...store.winConfigs, config],
      windowOrder: [...store.windowOrder, windowId]
    };
  });
}

export function unregisterWindow(windowId: string): void {
  WindowsStore.update(store => {
    const remainingConfigs = store.winConfigs.filter(w => w.id !== windowId);
    const newOrder = store.windowOrder.filter(id => id !== windowId);

    return {
      ...store,
      winConfigs: remainingConfigs,
      windowOrder: newOrder,
      activeWindowId: store.activeWindowId === windowId 
        ? (newOrder.length > 0 ? newOrder[newOrder.length - 1] : null)
        : store.activeWindowId
    };
  });
}

export function updateWindowConfig(windowId: string, config: Partial<WinConfig>): void {
  WindowsStore.update(store => {
    const windowExists = store.winConfigs.some(w => w.id === windowId);
    if (!windowExists) {
      console.warn(`Window ${windowId} not found`);
      return store;
    }

    
    return {
      ...store,
      winConfigs: store.winConfigs.map(w => 
        w.id === windowId ? { ...w, ...config } : w
      )
    };
  });
}

export function bringToFront(windowId: string): void {
  WindowsStore.update(store => {
    if (!store.winConfigs.find(w => w.id === windowId)) return store;

    const newOrder = store.windowOrder.filter(id => id !== windowId);
    newOrder.push(windowId);

    return {
      ...store,
      windowOrder: newOrder,
      activeWindowId: windowId
    };
  });
}

export function setActiveWindow(windowId: string | null): void {
  WindowsStore.update(store => ({
    ...store,
    activeWindowId: windowId
  }));
}

export function setDropTarget(windowId: string | null): void {
  WindowsStore.update(store => ({
    ...store,
    dropTargetId: windowId
  }));
}

export function getWindowZIndex(windowId: string): number {
  const store = get(WindowsStore);
  const index = store.windowOrder.indexOf(windowId);
  return index >= 0 ? index + 1 : 0;
}

export function getAllWindows(): WinConfig[] {
  return get(WindowsStore).winConfigs;
}

export function getWindowConfig(windowId: string): WinConfig | undefined {
  return get(WindowsStore).winConfigs.find(w => w.id === windowId);
}

// ── Tab-group helpers ──────────────────────────────────────────────

function generateGroupId(): string {
  return 'g-' + Math.random().toString(36).slice(2, 10);
}

/** Merge two windows into the same tab group. The target becomes the active tab. */
export function groupWindows(targetId: string, draggedId: string): void {
  WindowsStore.update(store => {
    const target = store.winConfigs.find(w => w.id === targetId);
    const dragged = store.winConfigs.find(w => w.id === draggedId);
    if (!target || !dragged) return store;

    const groupId = (target.groupId && target.groupId !== '') ? target.groupId : generateGroupId();

    return {
      ...store,
      winConfigs: store.winConfigs.map(w => {
        if (w.id === targetId) {
          return { ...w, groupId, activeInGroup: true };
        }
        if (w.id === draggedId) {
          // Dragged window adopts the target's bounds
          return { ...w, groupId, activeInGroup: false, bounds: { ...target.bounds } };
        }
        // If already part of this group keep groupId
        if (w.groupId === groupId) {
          return w;
        }
        return w;
      })
    };
  });
}

/** Remove a window from its group. If only one window remains, auto-dissolve the group. */
export function ungroupWindow(windowId: string, newBounds?: { x: number; y: number }): void {
  WindowsStore.update(store => {
    const win = store.winConfigs.find(w => w.id === windowId);
    if (!win || !win.groupId) return store;

    const groupId = win.groupId;
    const wasActive = win.activeInGroup;

    let configs = store.winConfigs.map(w => {
      if (w.id === windowId) {
        const updated: WinConfig = {
          ...w,
          groupId: '',
          activeInGroup: undefined,
        };
        if (newBounds) {
          updated.bounds = { ...w.bounds, x: newBounds.x, y: newBounds.y };
        }
        return updated;
      }
      return w;
    });

    // If the removed window was the active tab, activate the first remaining one
    const remaining = configs.filter(w => w.groupId === groupId);
    if (wasActive && remaining.length > 0 && !remaining.some(w => w.activeInGroup)) {
      configs = configs.map(w =>
        w.id === remaining[0].id ? { ...w, activeInGroup: true } : w
      );
    }

    // Auto-dissolve if only one window left in the group
    if (remaining.length === 1) {
      configs = configs.map(w =>
        w.id === remaining[0].id ? { ...w, groupId: '', activeInGroup: undefined } : w
      );
    }

    return { ...store, winConfigs: configs };
  });
}

/** Switch the visible tab inside a group. */
export function setActiveTab(groupId: string, tabId: string): void {
  WindowsStore.update(store => ({
    ...store,
    winConfigs: store.winConfigs.map(w => {
      if (w.groupId === groupId) {
        return { ...w, activeInGroup: w.id === tabId };
      }
      return w;
    })
  }));
}

/** Return all windows that belong to a given group. */
export function getGroupWindows(groupId: string): WinConfig[] {
  return get(WindowsStore).winConfigs.filter(w => w.groupId === groupId);
}
