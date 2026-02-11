<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { WindowsStore, bringToFront, updateWindowConfig } from '$lib/core/WindowsStore';
  import { type WinConfig } from '../types';
  import { get } from 'svelte/store';

  export let config: WinConfig;
  export let visible: boolean = true;
  export let zIndex: number = 1;
  export let windowId: string;

  let windowEl: HTMLElement;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle: string = '';
  let startX = 0;
  let startY = 0;
  let startBounds = { x: 0, y: 0, w: 0, h: 0 };

  // Snap state
  let snapGuides: { type: 'x' | 'y'; value: number }[] = [];
  let isAltPressed = false;
  const SNAP_THRESHOLD = 8;

  // Reactive bounds
  $: currentBounds = config.bounds;
  $: isActive = $WindowsStore.activeWindowId === windowId;

  onMount(() => {
    registerWindow();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  onDestroy(() => {
    unregisterWindow();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  });

  function registerWindow() {
    WindowsStore.update(store => {
      if (!store.winConfigs[windowId]) {
        store.winConfigs[windowId] = config;
        store.windowOrder = [...store.windowOrder, windowId];
      }
      return store;
    });
  }

  function unregisterWindow() {
    WindowsStore.update(store => {
      delete store.winConfigs[windowId];
      store.windowOrder = store.windowOrder.filter(id => id !== windowId);
      if (store.activeWindowId === windowId) {
        store.activeWindowId = store.windowOrder.length > 0 
          ? store.windowOrder[store.windowOrder.length - 1] 
          : null;
      }
      return store;
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Alt') isAltPressed = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'Alt') isAltPressed = false;
  }

  function onMouseDown(e: MouseEvent) {
    if (!visible) return;
    bringToFront(windowId);

    if (config.movable && config.hasHeader && (e.target as HTMLElement).closest('.window-header')) {
      startDrag(e);
    }
  }

  function startDrag(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startBounds = { ...currentBounds };

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }

  function onDragMove(e: MouseEvent) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = startBounds.x + dx;
    let newY = startBounds.y + dy;

    // Get viewport and other windows for snapping
    const viewport = getViewportBounds();
    const otherWindows = getOtherWindowsBounds();

    if (!isAltPressed) {
      const snap = calculateSnap(newX, newY, currentBounds.w, currentBounds.h, viewport, otherWindows);
      newX = snap.x;
      newY = snap.y;
      snapGuides = snap.guides;
    } else {
      snapGuides = [];
    }

    // Clamp to viewport
    newX = Math.max(0, Math.min(newX, viewport.w - currentBounds.w));
    newY = Math.max(0, Math.min(newY, viewport.h - currentBounds.h));

    updateBounds({ x: newX, y: newY });
  }

  function onDragEnd() {
    isDragging = false;
    snapGuides = [];
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);

    // Update store with final bounds
    updateWindowConfig(windowId, { bounds: currentBounds });
  }

  // Resize handlers
  function startResize(e: MouseEvent, handle: string) {
    if (!config.resizable) return;
    e.stopPropagation();
    bringToFront(windowId);

    isResizing = true;
    resizeHandle = handle;
    startX = e.clientX;
    startY = e.clientY;
    startBounds = { ...currentBounds };

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }

  function onResizeMove(e: MouseEvent) {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = startBounds.x;
    let newY = startBounds.y;
    let newW = startBounds.w;
    let newH = startBounds.h;

    // Apply resize based on handle
    if (resizeHandle.includes('e')) newW = startBounds.w + dx;
    if (resizeHandle.includes('w')) {
      newW = startBounds.w - dx;
      newX = startBounds.x + dx;
    }
    if (resizeHandle.includes('s')) newH = startBounds.h + dy;
    if (resizeHandle.includes('n')) {
      newH = startBounds.h - dy;
      newY = startBounds.y + dy;
    }

    // Apply limits
    const limits = config.boundsLimits || {};
    const minW = limits.minW || 100;
    const minH = limits.minH || 100;
    const maxW = limits.maxW || Infinity;
    const maxH = limits.maxH || Infinity;

    // Constrain minimum size
    if (newW < minW) {
      if (resizeHandle.includes('w')) newX = startBounds.x + startBounds.w - minW;
      newW = minW;
    }
    if (newH < minH) {
      if (resizeHandle.includes('n')) newY = startBounds.y + startBounds.h - minH;
      newH = minH;
    }

    // Constrain maximum size
    newW = Math.min(newW, maxW);
    newH = Math.min(newH, maxH);

    // Clamp to viewport
    const viewport = getViewportBounds();
    if (newX < 0) { newW += newX; newX = 0; }
    if (newY < 0) { newH += newY; newY = 0; }
    if (newX + newW > viewport.w) newW = viewport.w - newX;
    if (newY + newH > viewport.h) newH = viewport.h - newY;

    updateBounds({ x: newX, y: newY, w: newW, h: newH });
  }

  function onResizeEnd() {
    isResizing = false;
    resizeHandle = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);

    updateWindowConfig(windowId, { bounds: currentBounds });
  }

  function updateBounds(bounds: Partial<{ x: number; y: number; w: number; h: number }>) {
    config = { ...config, bounds: { ...currentBounds, ...bounds } };
  }

  function getViewportBounds() {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function getOtherWindowsBounds() {
    const store = get(WindowsStore);
    return Object.entries(store.winConfigs)
      .filter(([id]) => id !== windowId)
      .map(([_, cfg]) => cfg.bounds);
  }

  function calculateSnap(
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    viewport: { w: number; h: number },
    others: { x: number; y: number; w: number; h: number }[]
  ) {
    const guides: { type: 'x' | 'y'; value: number }[] = [];
    let snapX = x;
    let snapY = y;

    // Snap to viewport edges
    const viewportSnaps = [
      { type: 'x' as const, value: 0, target: x },
      { type: 'x' as const, value: viewport.w - w, target: x },
      { type: 'y' as const, value: 0, target: y },
      { type: 'y' as const, value: viewport.h - h, target: y }
    ];

    // Snap to other windows
    others.forEach(b => {
      // Left edge to others' right edge
      viewportSnaps.push({ type: 'x' as const, value: b.x + b.w, target: x });
      // Right edge to others' left edge  
      viewportSnaps.push({ type: 'x' as const, value: b.x - w, target: x });
      // Top to others' bottom
      viewportSnaps.push({ type: 'y' as const, value: b.y + b.h, target: y });
      // Bottom to others' top
      viewportSnaps.push({ type: 'y' as const, value: b.y - h, target: y });
      // Align centers
      viewportSnaps.push({ type: 'x' as const, value: b.x + b.w/2 - w/2, target: x });
      viewportSnaps.push({ type: 'y' as const, value: b.y + b.h/2 - h/2, target: y });
    });

    // Find closest snaps
    let bestX = x;
    let bestY = y;
    let minDistX = SNAP_THRESHOLD;
    let minDistY = SNAP_THRESHOLD;

    viewportSnaps.forEach(snap => {
      const dist = Math.abs(snap.value - snap.target);
      if (snap.type === 'x' && dist < minDistX) {
        minDistX = dist;
        bestX = snap.value;
        if (!guides.find(g => g.type === 'x' && g.value === snap.value)) {
          guides.push({ type: 'x', value: snap.value });
        }
      }
      if (snap.type === 'y' && dist < minDistY) {
        minDistY = dist;
        bestY = snap.value;
        if (!guides.find(g => g.type === 'y' && g.value === snap.value)) {
          guides.push({ type: 'y', value: snap.value });
        }
      }
    });

    return { x: bestX, y: bestY, guides };
  }
</script>

{#if visible}
  <div
    bind:this={windowEl}
    class="window"
    class:active={isActive}
    role="dialog"
    aria-modal="true"
    aria-label={config.title}
    tabindex="-1"
    style="
      left: {currentBounds.x}px;
      top: {currentBounds.y}px;
      width: {currentBounds.w}px;
      height: {currentBounds.h}px;
      z-index: {zIndex};
    "
    on:mousedown={onMouseDown}
  >
    {#if config.hasHeader}
      <div class="window-header">
        <span class="window-title">{config.title}</span>
      </div>
    {/if}

    <div class="window-content">
      <slot />
    </div>

    {#if config.resizable}
      <button type="button" class="resize-handle n" aria-label="Resize North" on:mousedown={(e) => startResize(e, 'n')}></button>
      <button type="button" class="resize-handle s" aria-label="Resize South" on:mousedown={(e) => startResize(e, 's')}></button>
      <button type="button" class="resize-handle e" aria-label="Resize East" on:mousedown={(e) => startResize(e, 'e')}></button>
      <button type="button" class="resize-handle w" aria-label="Resize West" on:mousedown={(e) => startResize(e, 'w')}></button>
      <button type="button" class="resize-handle ne" aria-label="Resize North East" on:mousedown={(e) => startResize(e, 'ne')}></button>
      <button type="button" class="resize-handle nw" aria-label="Resize North West" on:mousedown={(e) => startResize(e, 'nw')}></button>
      <button type="button" class="resize-handle se" aria-label="Resize South East" on:mousedown={(e) => startResize(e, 'se')}></button>
      <button type="button" class="resize-handle sw" aria-label="Resize South West" on:mousedown={(e) => startResize(e, 'sw')}></button>
    {/if}
  </div>

  <!-- Snap guides -->
  {#each snapGuides as guide}
    <div 
      class="snap-guide"
      class:vertical={guide.type === 'x'}
      class:horizontal={guide.type === 'y'}
      style={guide.type === 'x' ? `left: {guide.value}px` : `top: {guide.value}px`}
    ></div>
  {/each}
{/if}

<style>
  .window {
    position: absolute;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow 0.15s ease;
  }

  .window.active {
    border-color: #4a9eff;
    box-shadow: 0 4px 25px rgba(74, 158, 255, 0.3);
  }

  .window-header {
    height: 32px;
    background: linear-gradient(180deg, #2a2a2a 0%, #1f1f1f 100%);
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    cursor: default;
    user-select: none;
  }

  .window-title {
    font-size: 13px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .window-controls {
    display: flex;
    gap: 8px;
  }

  .window-btn {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    transition: all 0.2s;
  }

  .window-btn:hover {
    color: rgba(0, 0, 0, 0.7);
  }

  .window-btn.close { background: #ff5f56; }
  .window-btn.minimize { background: #ffbd2e; }
  .window-btn.maximize { background: #27c93f; }

  .window-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .resize-handle {
    position: absolute;
    z-index: 10;
  }

  .resize-handle.n {
    top: -4px;
    left: 8px;
    right: 8px;
    height: 8px;
    cursor: ns-resize;
  }

  .resize-handle.s {
    bottom: -4px;
    left: 8px;
    right: 8px;
    height: 8px;
    cursor: ns-resize;
  }

  .resize-handle.e {
    right: -4px;
    top: 8px;
    bottom: 8px;
    width: 8px;
    cursor: ew-resize;
  }

  .resize-handle.w {
    left: -4px;
    top: 8px;
    bottom: 8px;
    width: 8px;
    cursor: ew-resize;
  }

  .resize-handle.ne {
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    cursor: nesw-resize;
  }

  .resize-handle.nw {
    top: -4px;
    left: -4px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
  }

  .resize-handle.se {
    bottom: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
  }

  .resize-handle.sw {
    bottom: -4px;
    left: -4px;
    width: 12px;
    height: 12px;
    cursor: nesw-resize;
  }

  .snap-guide {
    position: fixed;
    background: #4a9eff;
    z-index: 9999;
    pointer-events: none;
  }

  .snap-guide.vertical {
    width: 1px;
    height: 100vh;
    top: 0;
  }

  .snap-guide.horizontal {
    height: 1px;
    width: 100vw;
    left: 0;
  }
</style>
