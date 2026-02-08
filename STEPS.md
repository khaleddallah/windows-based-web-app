# WM7 — Progress Tracker

## Step 1: Scaffold SvelteKit + Tailwind + TypeScript ✅

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

## Step 2: Core types (WinConfig, PluginConfig, PluginLife) ✅

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

## Step 3: Window.svelte (draggable, resizable, show/hide) ⬜

_Not started_

---

## Step 4: WindowManager ⬜

_Not started_

---

## Step 5: PluginManager ⬜

_Not started_

---

## Step 6: Store (Svelte 5 runes) ⬜

_Not started_

---

## Step 7: EventBus ⬜

_Not started_

---

## Step 8: ServiceClient ⬜

_Not started_

---

## Step 9: ServiceServer (FastAPI) ⬜

_Not started_

---

## Step 10: Theming (CSS custom properties) ⬜

_Not started_

---

## Step 11: LayoutPersistence ⬜

_Not started_

---

## Step 12: Test Plugin — Counter (with UI) ⬜

_Not started_

---

## Step 13: Test Plugin — Logger (no UI) ⬜

_Not started_

---

## Step 14: Test Plugin — Notes (with UI) ⬜

_Not started_

---

## Step 15: Integration test — all plugins running together ⬜

_Not started_


