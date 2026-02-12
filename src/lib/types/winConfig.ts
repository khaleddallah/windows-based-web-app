import type { Bounds, BoundsLimits } from './bounds.js';

// ── Window configuration (shared by Window.svelte and PluginConfig) ──

export interface WinConfig {
  id: string;
  title: string;
  bounds: Bounds;
  boundsLimits?: BoundsLimits;
  hasHeader: boolean;
  movable: boolean;
  resizable: boolean;
  visible?: boolean;
}
