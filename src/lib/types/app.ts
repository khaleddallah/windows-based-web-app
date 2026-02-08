import type { Bounds } from './bounds.js';

export interface AppConfig {
  plugins: string[];
}

export interface UserLayoutEntry {
  pluginId: string;
  bounds: Bounds;
}

export interface UserConfig {
  layouts: UserLayoutEntry[];
}