# WM7 — Progress Tracker

## Step 0: Scaffold SvelteKit + Tailwind + TypeScript ✅

### Commands Run
```bash
bunx sv create .
# Selected: SvelteKit minimal, TypeScript syntax, bun

bun add -d tailwindcss @tailwindcss/vite
# Tailwind CSS installed

bun add -d @sveltejs/adapter-auto
# Adapter was missing, installed manually

rm -rf node_modules bun.lockb
bun install
# Fixed corrupted node_modules
```

### Files Modified
| File | Change |
|---|---|
| `vite.config.ts` | Added `@tailwindcss/vite` plugin |
| `src/app.css` | Added `@import 'tailwindcss'` |
| `src/routes/+layout.svelte` | Added `import '../app.css'` |

### Status
- [x] SvelteKit scaffolded
- [x] TypeScript enabled
- [x] Tailwind CSS working
- [x] `bun run dev` runs on `localhost:5173`

---

## Step 1: Types ✅

### Files Created
| File | Contents |
|---|---|
| `src/lib/types/bounds.ts` | `Bounds`, `BoundsLimits` |
| `src/lib/types/plugin.ts` | `WinConfig`, `PluginApi`, `PluginConfig`, `PluginLife` |
| `src/lib/types/store.ts` | `AppStore` interface |
| `src/lib/types/events.ts` | `EventHandler`, `IEventBus` |
| `src/lib/types/service.ts` | `ServiceClientConfig`, `FileEntry` |
| `src/lib/types/app.ts` | `AppConfig`, `UserLayoutEntry`, `UserConfig` |
| `src/lib/types/index.ts` | Barrel re-export |

### Status
- [x] All interfaces & types defined
- [x] `PluginLife` base class with lifecycle hooks
- [x] Barrel export for clean imports (`$lib/types`)

---

## Step 2: Theme tokens ✅

Define CSS custom properties (`--wm-*`) in `app.css`, extend Tailwind v4 `@theme` to map them.

### Files Modified / Created
| File | Change |
|---|---|
| `src/app.css` | Added `:root` block with all `--wm-*` custom properties (dark theme defaults) |
| `src/app.css` | Added `[data-theme="light"]` override with light theme values |
| `src/app.css` | Added `@theme` block mapping tokens to Tailwind v4 utilities (`--color-wm-*`, `--radius-wm`, `--spacing-wm-header`) |
| `src/lib/core/ThemeSwitcher.ts` | Created — `setTheme()`, `getTheme()`, `toggleTheme()`, `initTheme()` with `localStorage` persistence |

### Tokens Defined
| Token | Value | Tailwind Utility |
|---|---|---|
| `--wm-bg-primary` | `#1e1e2e` | `bg-wm-bg-primary` |
| `--wm-bg-secondary` | `#313244` | `bg-wm-bg-secondary` |
| `--wm-bg-surface` | `#45475a` | `bg-wm-bg-surface` |
| `--wm-text-primary` | `#cdd6f4` | `text-wm-text-primary` |
| `--wm-text-secondary` | `#a6adc8` | `text-wm-text-secondary` |
| `--wm-border` | `#585b70` | `border-wm-border` |
| `--wm-accent` | `#89b4fa` | `text-wm-accent`, `bg-wm-accent` |
| `--wm-accent-hover` | `#74c7ec` | `hover:bg-wm-accent-hover` |
| `--wm-header-bg` | `#313244` | `bg-wm-header-bg` |
| `--wm-header-height` | `28px` | `h-wm-header` |
| `--wm-radius` | `6px` | `rounded-wm` |
| `--wm-snap-guide` | `rgba(137,180,250,0.4)` | `bg-wm-snap-guide` |

### Status
- [x] CSS custom properties defined under `:root`
- [x] Light theme via `[data-theme="light"]` selector
- [x] Tailwind v4 `@theme` mappings (no `tailwind.config.js` needed)
- [x] `ThemeSwitcher.ts` — get/set/toggle + localStorage persistence
- [x] Build passes

---

## Step 3: Window component ✅

**File:** `src/lib/components/Window.svelte`

- Svelte window component with:
	- Drag and resize (with 8px snap threshold to viewport and sibling windows)
	- Header bar (optional, with title)
	- Z-index/active state via store
	- Resizable handles (8 directions)
	- Clamp to viewport and min/max bounds
	- Snap guides (visual lines)
	- `visible` prop
	- Keyboard Alt disables snapping
	- Store registration/unregistration on mount/destroy

**Status:**
- [x] Window.svelte implemented and integrated with store
- [x] All core window behaviors (drag, resize, snap, z-index, header, visible)

---

## Step 4: WindowManager ✅

**File:** `src/lib/core/WindowsStore.ts`

- Svelte store and helpers for window management:
	- `WindowsStore` writable store with window configs, order, and active window
	- `registerWindow`, `unregisterWindow` for lifecycle
	- `bringToFront`, `setActiveWindow`, `updateWindowConfig` for z-index and state
	- Snap logic integrated in Window.svelte
	- `getWindowZIndex`, `getAllWindows`, `getWindowConfig` helpers

**Status:**
- [x] WindowManager store and API implemented
- [x] Z-index, stacking, active window, and config updates all managed in store

---

## Step 5: AppStore ✅

**File:** `src/lib/core/AppStore.ts`

- Implements the shared reactive store contract (`AppStore` interface from `src/lib/types/store.ts`).
- Uses Svelte's `writable` store under the hood.
- Provides `get`, `set`, and `subscribe` methods for plugins to share state.
- Keys are namespaced for plugin safety.

**Status:**
- [x] AppStore implemented in `src/lib/core/AppStore.ts`
- [x] Interactive test added in `+page.svelte` to verify store functionality

---

## Step 6: EventBus ✅

**File:** `src/lib/core/EventBus.ts`

- Implements the pub/sub event bus contract (`IEventBus` interface from `src/lib/types/events.ts`).
- Provides `on`, `emit`, and `off` methods for transient, fire-and-forget events.
- Handlers are registered per event name and can be unsubscribed.
- Tested in `+page.svelte` with interactive event emission and subscription.

**Status:**
- [x] EventBus implemented in `src/lib/core/EventBus.ts`
- [x] Interactive test added in `+page.svelte` to verify event bus functionality

---

## Step 7: LayoutPersistence ⬜

`save()`/`load()`/`clear()` with `localStorage`, debounced save on drag/resize-end.

_Not started_

---

## Step 8: PluginManager ⬜

Plugin registry, PluginLife lifecycle dispatch, inter-plugin API.

_Not started_

---

## Step 9: App Shell ⬜

`+page.svelte` that reads config, boots PluginManager, provides EventBus via context, renders windows.

_Not started_

---

## Step 10: FilesServer ⬜

FastAPI router with list/read/write endpoints + CORS middleware in `main.py`.

_Not started_

---

## Step 11: FilesClient ⬜

TypeScript client wrapping FilesServer API.

_Not started_

---

## Step 12: Test Plugin A (explorer) ⬜

UI plugin using Window — uses FilesClient.

_Not started_

---

## Step 13: Test Plugin B (properties) ⬜

UI plugin using Window — reads Store for selected item.

_Not started_

---

## Step 14: Test Plugin C (logger) ⬜

Headless plugin — subscribes to Store + EventBus, logs changes to console.

_Not started_

---

## Step 15: Wiring & polish ⬜

Connect everything, apply persistence, test edge cases.

_Not started_


