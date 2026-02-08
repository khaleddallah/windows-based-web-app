import type { Unsubscriber } from 'svelte/store';

export interface AppStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe(key: string, callback: (value: any) => void): Unsubscriber;
}