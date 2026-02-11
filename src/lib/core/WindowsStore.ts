import { writable, get, type Writable } from 'svelte/store';
import { type WinConfig } from '../types';

// Store state interface
interface WindowsState {
  winConfigs: Record<string, WinConfig>;
  windowOrder: string[];
  activeWindowId: string | null;
}

// Initial state
const initialState: WindowsState = {
  winConfigs: {},
  windowOrder: [],
  activeWindowId: null
};

// Create the store
export const WindowsStore: Writable<WindowsState> = writable(initialState);

// Exported functions

export function registerWindow(windowId: string, config: WinConfig): void {
  WindowsStore.update(store => {
    if (store.winConfigs[windowId]) {
      console.warn(`Window ${windowId} already registered`);
      return store;
    }

    return {
      ...store,
      winConfigs: { ...store.winConfigs, [windowId]: config },
      windowOrder: [...store.windowOrder, windowId]
    };
  });
}

export function unregisterWindow(windowId: string): void {
  WindowsStore.update(store => {
    const { [windowId]: _, ...remainingConfigs } = store.winConfigs;
    const newOrder = store.windowOrder.filter(id => id !== windowId);

    return {
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
    if (!store.winConfigs[windowId]) {
      console.warn(`Window ${windowId} not found`);
      return store;
    }

    return {
      ...store,
      winConfigs: {
        ...store.winConfigs,
        [windowId]: { ...store.winConfigs[windowId], ...config }
      }
    };
  });
}

export function bringToFront(windowId: string): void {
  WindowsStore.update(store => {
    if (!store.winConfigs[windowId]) return store;

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

export function getWindowZIndex(windowId: string): number {
  const store = get(WindowsStore);
  const index = store.windowOrder.indexOf(windowId);
  return index >= 0 ? index + 1 : 0;
}

export function getAllWindows(): Record<string, WinConfig> {
  return get(WindowsStore).winConfigs;
}

export function getWindowConfig(windowId: string): WinConfig | undefined {
  return get(WindowsStore).winConfigs[windowId];
}
