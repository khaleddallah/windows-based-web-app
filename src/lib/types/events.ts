import type { Unsubscriber } from 'svelte/store';

export type EventHandler<T = any> = (payload: T) => void;

export interface IEventBus {
  on<T = any>(event: string, handler: EventHandler<T>): Unsubscriber;
  emit<T = any>(event: string, payload: T): void;
  off(event: string, handler: EventHandler): void;
}