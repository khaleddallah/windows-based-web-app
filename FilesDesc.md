# Files Description

## Skeleton / Config

These are boilerplate files you rarely edit.

### `package.json`
Lists all dependencies (Svelte, Tailwind, Vite…) and the scripts you run: `bun run dev`, `bun run build`, etc.

### `tsconfig.json`
TypeScript compiler settings. Extends SvelteKit's auto-generated config so we get path aliases like `$lib` for free.

### `svelte.config.js`
Tells SvelteKit which adapter to use for deployment. Right now it's `adapter-auto`.

### `vite.config.ts`
Configures the Vite bundler. Loads two plugins: Tailwind CSS and SvelteKit.

### `src/app.d.ts`
Global TypeScript declarations for the SvelteKit `App` namespace (error shapes, locals, etc.). Mostly untouched.

### `static/robots.txt`
Tells search engines what to crawl. Not relevant to the app itself.

---

## Entry Points

The app boots through these files, in this order.

### `src/app.html`
The single HTML shell. SvelteKit injects everything into the `%sveltekit.head%` and `%sveltekit.body%` placeholders. You almost never edit this.

### `src/app.css`
Global stylesheet. Currently just imports Tailwind. Will eventually hold our theme tokens (`--wm-*` CSS custom properties).

### `src/routes/+layout.svelte`
The root layout — wraps every page. Imports `app.css` so Tailwind is available everywhere, and sets the favicon.

### `src/routes/+page.svelte`
The main (and only) page. This will become the **App Shell** — the surface that renders the WindowManager, all plugin windows, and the toolbar.

---

## Library Barrel

### `src/lib/index.ts`
The main re-export entry for the `$lib` alias. Currently empty — will grow as we add managers and components.

### `src/lib/types/index.ts`
Barrel file for all types. Lets you write `import { Bounds, PluginConfig } from '$lib/types'` instead of importing from individual files.

---

## Types

All live under `src/lib/types/`. They define the **contracts** — no logic, just shapes.

### `bounds.ts`
Defines `Bounds` (a rectangle: x, y, w, h) and `BoundsLimits` (optional min/max constraints on width and height). Used everywhere a window or panel needs a position and size.

### `plugin.ts`
The biggest type file. Defines:
- **`WinConfig`** — how a plugin's window looks and behaves (title, bounds, movable, resizable…).
- **`PluginApi`** — a named method a plugin exposes to other plugins.
- **`PluginConfig`** — the full description of a plugin: its id, name, whether it has UI, its window config, its APIs, and its dependencies.
- **`PluginLife`** — an optional base class with lifecycle hooks (`onInit`, `onActivate`, `onDeactivate`, `onDestroy`). A plugin can extend this if it needs setup/teardown logic.

### `store.ts`
Defines `AppStore` — the shared reactive state contract. Plugins use `get`/`set`/`subscribe` to share data (like the currently selected file, theme, etc.) without importing each other.

### `events.ts`
Defines `EventHandler` and `IEventBus` — the pub/sub contract for fire-and-forget signals. Unlike the Store (persistent state), events are transient: if nobody is listening when it fires, it's gone.

### `service.ts`
Defines `ServiceClientConfig` (base URL + prefix for talking to a backend) and `FileEntry` (the shape of a file object returned by the files API: name, path, isDir, size).

### `app.ts`
Defines `AppConfig` (which plugins to load), `UserLayoutEntry` (a saved window position for one plugin), and `UserConfig` (the full saved layout). This is what gets persisted so windows reopen where you left them.
