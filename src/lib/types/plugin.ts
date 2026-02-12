import type { Bounds, BoundsLimits } from './bounds.js';

// ── Window configuration (shared by Window.svelte and PluginConfig) ──

export interface WinConfig {
  title: string;
  bounds: Bounds;
  boundsLimits?: BoundsLimits;
  hasHeader: boolean;
  movable: boolean;
  resizable: boolean;
  visible?: boolean;
}

// ── Plugin API (methods a plugin exposes to other plugins) ──

export interface PluginApi {
  name: string;
  handler: (...args: any[]) => any;
}

// ── Plugin configuration ──

export interface PluginConfig {
  id: string;
  name: string;
  hasUI: boolean;
  winConfig?: WinConfig;
  apis?: PluginApi[];
  dependencies?: string[];
}

// ── Plugin lifecycle (optional base class) ──

export class PluginLife {
  onInit(): void | Promise<void> { }
  onActivate(): void | Promise<void> { }
  onDeactivate(): void | Promise<void> { }
  onDestroy(): void | Promise<void> { }
}