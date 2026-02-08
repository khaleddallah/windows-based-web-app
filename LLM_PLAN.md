# LLM_PLAN — Software Design

---

## 1. Summary

A **plugin-based windowing framework** built with **SvelteKit + Tailwind + TypeScript** (frontend), **Bun** (runtime & package manager), and **FastAPI** (backend). The framework lets developers compose multi-view desktop-like apps (IDEs, diagram editors, etc.) from independent **Plugins** that can have windows, share state via a **Store**, and reach backend functionality through **ServiceClient → ServiceServer** pairs.

**Scope of this phase:** Build the core framework with:
- 3 test plugins (2 with UI/Window, 1 headless)
- 1 ServiceServer (FastAPI)
- 1 ServiceClient (TypeScript)
- 1 Store (shared state)

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                        Browser                            │
│                                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │                   App Shell                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐    │    │
│  │  │ Plugin A │  │ Plugin B │  │  Plugin C     │    │    │
│  │  │ (w/ Win) │  │ (w/ Win) │  │  (headless)   │    │    │
│  │  └────┬─────┘  └────┬─────┘  └──────┬────────┘    │    │
│  │       │             │               │             │    │
│  │       └──────┬──────┴───────┬───────┘             │    │
│  │              ▼              ▼                     │    │
│  │            Store       ServiceClient              │    │
│  └──────────────────────────┬────────────────────────┘    │
│                             │  HTTP / WS                  │
└─────────────────────────────┼─────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────┐
│                     FastAPI Backend                       │
│                             ▼                             │
│                      ServiceServer                        │
│                    (e.g. FilesServer)                     │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts — Detailed Design

### 3.1 Window

A generic, reusable Svelte component. Knows nothing about the plugin it contains.

Window accepts a **`WinConfig`** (the same type used by plugins) plus one Window-only prop:

| Prop | Type | Default | Description |
|---|---|---|---|
| `config` | `WinConfig` | — | All shared window settings (see type below) |
| `visible` | `boolean` | `true` | Show or hide the window (Window-only, not part of WinConfig) |

**`WinConfig`** (shared type — used by both Window and PluginConfig):

```ts
interface WinConfig {
  title: string;
  bounds: Bounds;
  boundsLimits?: BoundsLimits;
  hasHeader: boolean;
  movable: boolean;
  resizable: boolean;
}
```

**Behaviour:**
- Clamped inside the app viewport (never exceeds app boundaries).
- Snappable to app edges and to neighbouring windows (see snapping rules below).
- Header is a compact bar at the top-left with a drag-handle icon and the title.
- `show()` / `hide()` are implemented directly in `Window.svelte` by toggling the `visible` prop. Plugins delegate visibility control to their Window instance.

**Z-index / Focus Management** (handled by `WindowManager`):
- A global `windowOrder: string[]` array tracks stacking order (last = top).
- Clicking anywhere inside a window calls `WindowManager.bringToFront(windowId)` which moves it to the end of the array.
- Each `Window.svelte` receives a reactive `zIndex` derived from its position in `windowOrder`.
- An `activeWindowId` writable store tracks which window is focused. The active window gets a subtle visual indicator (e.g. brighter header border).

```ts
class WindowManager {
  windowOrder: string[];          // stacking order, last = top
  activeWindowId: Writable<string | null>;

  bringToFront(windowId: string): void;   // moves to top of stack
  getZIndex(windowId: string): number;    // returns position-based z-index
  register(windowId: string): void;       // add window to stack
  unregister(windowId: string): void;     // remove window from stack
}
```

**Window Snapping Rules:**
- **Snap threshold:** `8px` — when a window edge is within 8px of a target edge, it snaps.
- **Snap targets:**
  1. App viewport edges (top, bottom, left, right).
  2. Edges of other visible windows (enables side-by-side tiling).
- **Snap axis:** Snapping is per-axis (horizontal and vertical independently).
- **During drag:** Preview guides (thin lines) appear when the window is near a snap target.
- **During resize:** The resizing edge snaps to the same targets.
- **Disable:** Holding `Alt` while dragging/resizing disables snapping temporarily.

### 3.2 Plugin

An independent feature unit. It may or may not have a Window/UI.

**PluginConfig** (defined in lib, each plugin provides one):

```ts
interface PluginConfig {
  id: string;              // unique, e.g. "explorer"
  name: string;            // display name
  hasUI: boolean;          // whether it renders a Window
  winConfig?: WinConfig;   // initial window settings (if hasUI) — same WinConfig type from §3.1
  apis?: PluginApi[];      // methods exposed to other plugins
  dependencies?: string[]; // IDs of plugins this plugin depends on
}
// WinConfig is defined once in §3.1 and reused here.

// Optional base class — extend it only if your plugin needs lifecycle hooks.
class PluginLife {
  onInit(): void | Promise<void> {}        // called once when the plugin is first registered
  onActivate(): void | Promise<void> {}    // called when the plugin becomes active
  onDeactivate(): void | Promise<void> {}  // called when the plugin is deactivated
  onDestroy(): void | Promise<void> {}     // called when the plugin is removed / app shuts down
}
```

A plugin **may** extend `PluginLife` to hook into the lifecycle. If it doesn't, the framework simply skips lifecycle calls for that plugin.

**Visibility:** `show()` / `hide()` are handled by `Window.svelte` (see §3.1). A plugin with UI delegates visibility to its Window.

**Plugin ↔ Plugin communication:**
- Via the **Store** (reactive shared state).
- Via the **EventBus** (transient signals).
- Via calling another plugin's registered API methods through the **PluginManager** registry (see below).

**Plugin-to-plugin API contract** (handled by `PluginManager`):

Each plugin can expose methods in its `apis` field. The `PluginManager` collects them into a central registry. Any plugin can call another plugin's method **by plugin ID + method name** — no direct imports needed.

```ts
// Defining an API in a plugin's config:
interface PluginApi {
  name: string;                          // method name, e.g. "getSelectedFile"
  handler: (...args: any[]) => any;      // the actual function
}

// PluginManager registry:
class PluginManager {
  private plugins: Map<string, PluginConfig>;
  private apiRegistry: Map<string, Map<string, PluginApi>>; // pluginId → { methodName → handler }

  register(config: PluginConfig, life?: PluginLife): void;   // registers plugin + its apis
  unregister(pluginId: string): void;

  // Call another plugin's API:
  call<T>(pluginId: string, method: string, ...args: any[]): T | undefined {
    const api = this.apiRegistry.get(pluginId)?.get(method);
    if (!api) {
      console.error(`[PluginManager] API not found: ${pluginId}.${method}`);
      return undefined;
    }
    return api.handler(...args);
  }

  // Lifecycle dispatch:
  async initAll(): Promise<void>;       // calls onInit on all PluginLife instances
  async destroyAll(): Promise<void>;    // calls onDestroy on all PluginLife instances
}
```

**Usage from a plugin:**
```ts
// Plugin B wants to ask Plugin A (explorer) for the selected file:
const file = pluginManager.call<string>('explorer', 'getSelectedFile');
```

Plugins stay fully decoupled — they only know the target plugin's `id` and method `name`, never import each other directly.

### 3.3 Store

A Svelte-native reactive store (writable/readable) used to **share state between plugins**.

Design:
- A central `createAppStore()` returns a namespaced store.
- Each plugin can read/write to shared keys.
- Uses Svelte `writable` stores under the hood so all subscribers react automatically.

```ts
interface AppStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe(key: string, callback: (value: any) => void): Unsubscriber;
}
```

### 3.4 EventBus

A lightweight **publish/subscribe** system for transient, fire-and-forget events (as opposed to the Store which holds persistent state).

Use cases: notifications, commands, keyboard shortcuts, "file saved", "selection changed" signals.

```ts
class EventBus {
  on<T>(event: string, handler: (payload: T) => void): Unsubscriber;
  emit<T>(event: string, payload: T): void;
  off(event: string, handler: Function): void;
}
```

**Design decisions:**
- Events are strings (namespaced by convention: `"explorer:fileSelected"`, `"logger:clear"`).
- Handlers are called synchronously in registration order.
- `on()` returns an `Unsubscriber` function — plugins must call it in `onDestroy` to avoid leaks.
- A single global `EventBus` instance is created by the App Shell and injected via Svelte context.

**Store vs EventBus:**
| | Store | EventBus |
|---|---|---|
| Purpose | Shared state (persistent) | Transient signals (fire-and-forget) |
| Read later? | Yes — `.get(key)` anytime | No — if you missed it, it's gone |
| Example | `selectedFile`, `theme` | `"file:saved"`, `"shortcut:ctrl+s"` |

### 3.5 ServiceServer (Backend)

A FastAPI router module that exposes a set of REST (or WebSocket) endpoints.

```
ServiceServer
├── router: APIRouter
├── prefix: str          # e.g. "/api/files"
└── endpoints            # list, read, write, etc.
```

For this phase: **FilesServer** — list / read / write files from the filesystem.

**CORS Configuration** (in `main.py`):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # SvelteKit dev server
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- In production, `allow_origins` should be restricted to the actual frontend domain.
- Auth is out-of-scope for this phase. When needed, add a simple token/API-key middleware.

### 3.6 ServiceClient (Frontend)

A TypeScript class that wraps a ServiceServer's API into ergonomic async methods.

```ts
class ServiceClient {
  constructor(config: { baseUrl: string; prefix: string })

  // All requests go through this — catches errors and logs to console.
  protected async request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    try {
      const res = await fetch(`${this.baseUrl}${this.prefix}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.error(`[ServiceClient] ${method} ${path} failed:`, err);
      return null;
    }
  }
}

class FilesClient extends ServiceClient {
  async listDir(path: string): Promise<FileEntry[] | null>  { return this.request('GET', `/list?path=${path}`); }
  async readFile(path: string): Promise<string | null>      { return this.request('GET', `/read?path=${path}`); }
  async writeFile(path: string, content: string): Promise<void> {
    await this.request('POST', '/write', { path, content });
  }
}
```

**Error handling (phase 1):** All errors are caught in the base `request()` method and logged via `console.error`. Methods return `null` on failure so the calling plugin can check and handle gracefully. No UI error toasts for now.

A plugin creates/imports a client instance and calls methods — no raw `fetch` scattered around plugin code.

### 3.7 App

The top-level orchestrator.

- Reads an **AppConfig** that declares which plugins to load.
- Instantiates the **PluginManager** (registers plugins, resolves dependencies).
- Renders the **Window** layer.
- Applies **UserConfigs** (layout overrides).

```ts
interface AppConfig {
  plugins: string[];       // plugin IDs to activate
}

interface UserConfig {
  layouts: {
    pluginId: string;
    bounds: Bounds;         // overrides the plugin's default WinConfig.bounds
  }[];
}
```

### 3.8 Persistence

UserConfigs (window layouts) should survive page reloads.

**Strategy: `localStorage` (phase 1), backend-saveable (future).**

```ts
class LayoutPersistence {
  private storageKey = 'wm7:userConfig';

  save(config: UserConfig): void {
    localStorage.setItem(this.storageKey, JSON.stringify(config));
  }

  load(): UserConfig | null {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}
```

**When to save:**
- On every window drag-end or resize-end (debounced, 500ms).
- On `beforeunload` as a safety net.

**Load order:**
1. Load `UserConfig` from `localStorage`.
2. If found → override each plugin's default `WinConfig.bounds`.
3. If not found → use plugin defaults from `PluginConfig.winConfig`.

### 3.9 Theming

A set of **CSS custom properties** (design tokens) defined at the `:root` level. All framework components and plugins use these tokens instead of hard-coded colours.

```css
/* app.css — default dark theme */
:root {
  --wm-bg-primary:    #1e1e2e;
  --wm-bg-secondary:  #313244;
  --wm-bg-surface:    #45475a;
  --wm-text-primary:  #cdd6f4;
  --wm-text-secondary:#a6adc8;
  --wm-border:        #585b70;
  --wm-accent:        #89b4fa;
  --wm-accent-hover:  #74c7ec;
  --wm-header-bg:     #313244;
  --wm-header-height: 28px;
  --wm-radius:        6px;
  --wm-snap-guide:    rgba(137,180,250,0.4);
}
```

**How plugins use it:**
- Directly in CSS: `background: var(--wm-bg-primary);`
- Tailwind integration: extend `tailwind.config.js` to map tokens → Tailwind colours:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      wm: {
        'bg-primary':   'var(--wm-bg-primary)',
        'bg-secondary': 'var(--wm-bg-secondary)',
        'text-primary': 'var(--wm-text-primary)',
        'accent':       'var(--wm-accent)',
        // ... etc
      }
    }
  }
}
```

This way plugins can write `class="bg-wm-bg-primary text-wm-text-primary"` and stay theme-consistent.

**Switching themes:** Swap a CSS class on `<html>` (e.g. `data-theme="light"`) that redefines the variables. Out-of-scope for this phase but the architecture supports it.

---

## 4. What's Missing / Recommendations

### Resolved in this plan

| # | Gap | Solution |
|---|-----|----------|
| 1 | **Z-index / focus management** | ✅ Solved in §3.1 — `WindowManager` with `windowOrder[]`, `bringToFront()`, `activeWindowId`. |
| 2 | **Window snapping rules** | ✅ Solved in §3.1 — 8px threshold, snap to viewport + sibling windows, per-axis, Alt to disable. |
| 5 | **Theming / style tokens** | ✅ Solved in §3.9 — CSS custom properties (`--wm-*`) mapped into Tailwind config. |
| 6 | **Persistence** | ✅ Solved in §3.8 — `LayoutPersistence` class using `localStorage`, debounced save on drag/resize-end. |
| 7 | **Backend CORS / auth** | ✅ Solved in §3.5 — `CORSMiddleware` configured in `main.py`. Auth deferred to future phase. |
| 8 | **Event bus** | ✅ Solved in §3.4 — `EventBus` class with `on/emit/off`, namespaced events, injected via Svelte context. |
| 3 | **Error handling strategy** | ✅ Solved in §3.6 — Base `ServiceClient.request()` catches all errors and logs via `console.error`. Returns `null` on failure. |
| 4 | **Plugin-to-plugin API contract** | ✅ Solved in §3.2 — `PluginManager.call(pluginId, method, ...args)` dispatches to registered `PluginApi` handlers. No direct imports between plugins. |

All gaps resolved. ✅

---

## 5. File & Folder Structure

```
wm7/
├── Project.md
├── LLM_PLAN.md
│
├── backend/                          # FastAPI backend
│   ├── main.py                       # App entrypoint, mounts routers, CORS
│   ├── requirements.txt
│   └── services/
│       └── files_server.py           # FilesServer — ServiceServer impl
│
├── frontend/                         # SvelteKit app
│   ├── package.json
│   ├── svelte.config.js
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── app.html
│   │   ├── app.css                   # Tailwind directives + global styles + theme tokens (--wm-*)
│   │   │
│   │   ├── lib/                      # Framework core (reusable library)
│   │   │   ├── types/
│   │   │   │   ├── bounds.ts         # Bounds, BoundsLimits types
│   │   │   │   ├── plugin.ts         # PluginConfig, WinConfig, PluginApi, PluginLife
│   │   │   │   ├── store.ts          # AppStore interface
│   │   │   │   ├── events.ts         # EventBus types
│   │   │   │   └── service.ts        # ServiceClient base types
│   │   │   │
│   │   │   ├── components/
│   │   │   │   └── Window.svelte     # Generic Window component
│   │   │   │
│   │   │   ├── core/
│   │   │   │   ├── PluginManager.ts  # Registry, lifecycle, inter-plugin API
│   │   │   │   ├── WindowManager.ts  # Z-index, focus, snapping, clamping logic
│   │   │   │   ├── AppStore.ts       # Shared reactive store implementation
│   │   │   │   ├── EventBus.ts       # Pub/sub event bus for transient events
│   │   │   │   └── LayoutPersistence.ts # Save/load UserConfig to localStorage
│   │   │   │
│   │   │   └── services/
│   │   │       ├── ServiceClient.ts  # Base ServiceClient class
│   │   │       └── FilesClient.ts    # FilesClient extends ServiceClient
│   │   │
│   │   ├── plugins/                  # Plugin implementations
│   │   │   ├── explorer/             # Test Plugin A — with UI (file explorer)
│   │   │   │   ├── config.ts         # PluginConfig for explorer
│   │   │   │   ├── Explorer.svelte   # UI component
│   │   │   │   └── index.ts          # Plugin entry (lifecycle hooks)
│   │   │   │
│   │   │   ├── properties/           # Test Plugin B — with UI (properties panel)
│   │   │   │   ├── config.ts
│   │   │   │   ├── Properties.svelte
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── logger/              # Test Plugin C — headless (no UI)
│   │   │       ├── config.ts
│   │   │       └── index.ts          # Listens to store changes, logs them
│   │   │
│   │   ├── config/
│   │   │   ├── app.config.ts         # AppConfig — which plugins to load
│   │   │   └── user.config.ts        # UserConfig — layout overrides
│   │   │
│   │   └── routes/
│   │       └── +page.svelte          # Main page — App Shell, renders everything
│   │
│   └── static/
│       └── favicon.png
│
└── README.md
```

### Structure Rationale

| Directory | Purpose |
|---|---|
| `lib/types/` | All TypeScript interfaces/types — single source of truth (includes event types). |
| `lib/components/` | Framework-level UI components (just `Window` for now). |
| `lib/core/` | The "engine" — plugin lifecycle, window management (z-index + snapping), shared store, event bus, layout persistence. |
| `lib/services/` | ServiceClient base + concrete clients. One file per backend service. |
| `plugins/` | Each plugin is a self-contained folder with its config, UI (optional), and entry point. Easy to add/remove. |
| `config/` | App-level and user-level configuration. |
| `backend/services/` | Each ServiceServer is a FastAPI router in its own file. `main.py` mounts them all + CORS. |

---

## 6. Implementation Order

| Step | Task | Details |
|---|---|---|
| 1 | **Types** | Define all interfaces in `lib/types/` — Bounds, WinConfig, PluginConfig, PluginLife, AppStore, EventBus types, ServiceClient types. |
| 2 | **Theme tokens** | Define CSS custom properties (`--wm-*`) in `app.css`, extend `tailwind.config.js` to map them. |
| 3 | **Window component** | Build `Window.svelte` with drag, resize, clamp, header, `visible` prop. |
| 4 | **WindowManager** | Z-index stacking (`windowOrder[]`), `bringToFront()`, `activeWindowId`, snapping (8px threshold, viewport + siblings). |
| 5 | **AppStore** | Implement the shared reactive store. |
| 6 | **EventBus** | Implement pub/sub `EventBus` class with `on/emit/off`. |
| 7 | **LayoutPersistence** | `save()`/`load()`/`clear()` with `localStorage`, debounced save on drag/resize-end. |
| 8 | **PluginManager** | Plugin registry, PluginLife lifecycle dispatch, inter-plugin API. |
| 9 | **App Shell** | `+page.svelte` that reads config, boots PluginManager, provides EventBus via context, renders windows. |
| 10 | **FilesServer** | FastAPI router with list/read/write endpoints + CORS middleware in `main.py`. |
| 11 | **FilesClient** | TypeScript client wrapping FilesServer API. |
| 12 | **Test Plugin A** (explorer) | UI plugin using Window — uses FilesClient. |
| 13 | **Test Plugin B** (properties) | UI plugin using Window — reads Store for selected item. |
| 14 | **Test Plugin C** (logger) | Headless plugin — subscribes to Store + EventBus, logs changes to console. |
| 15 | **Wiring & polish** | Connect everything, apply persistence, test edge cases. |
