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

## Step 2: Theme tokens ⬜

Define CSS custom properties (`--wm-*`) in `app.css`, extend `tailwind.config.js` to map them.

_Not started_

---

## Step 3: Window component ⬜

Build `Window.svelte` with drag, resize, clamp, header, `visible` prop.

_Not started_

---

## Step 4: WindowManager ⬜

Z-index stacking (`windowOrder[]`), `bringToFront()`, `activeWindowId`, snapping (8px threshold, viewport + siblings).

_Not started_

---

## Step 5: AppStore ⬜

Implement the shared reactive store.

_Not started_

---

## Step 6: EventBus ⬜

Implement pub/sub `EventBus` class with `on/emit/off`.

_Not started_

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


