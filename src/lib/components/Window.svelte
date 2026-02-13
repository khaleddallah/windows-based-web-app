<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    WindowsStore,
    bringToFront,
    updateWindowConfig,
    registerWindow as registerWin,
    unregisterWindow as unregisterWin,
    groupWindows,
    ungroupWindow,
    setActiveTab,
    setDropTarget,
  } from "$lib/core/WindowsStore";
  import { type WinConfig } from "../types";
  import { get } from "svelte/store";

  export let config: WinConfig;
  export let zIndex: number = 1;

  // Capture the window id once – this never changes and avoids a reactive cycle.
  const configId = config.id;

  // Keep config in sync with the store – any update via updateWindowConfig()
  // will be reflected here automatically.  Skip during drag/resize so local
  // position changes aren't overwritten by stale store values.
  $: storeConfig = $WindowsStore.winConfigs.find(w => w.id === configId);
  $: if (storeConfig && !isDragging && !isResizing) config = storeConfig;

  let windowEl: HTMLElement;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle: string = "";
  let startX = 0;
  let startY = 0;
  let startBounds = { x: 0, y: 0, w: 0, h: 0 };

  // Snap state - guides now store position and which edge they represent
  type Guide = { type: "x" | "y"; value: number; pos: number; length?: number };
  let snapGuides: Guide[] = [];
  let isAltPressed = false;
  const SNAP_THRESHOLD = 8;

  // ── Tab group state ──

  // Tab tear-off state
  let isTearingTab = false;
  let tearTabId: string | null = null;
  let tearStartX = 0;
  let tearStartY = 0;
  const TEAR_THRESHOLD = 40;

  // Reactive values from store
  $: currentBounds = config.bounds;
  $: isActive = $WindowsStore.activeWindowId === configId;
  $: zIndex = $WindowsStore.windowOrder.indexOf(configId) + 1;
  $: isVisible = config.visible;

  // Group reactivity
  $: isGrouped = !!(config.groupId && config.groupId !== '');
  $: isActiveTab = config.activeInGroup === true;
  $: groupMembers = isGrouped
    ? $WindowsStore.winConfigs.filter(w => w.groupId === config.groupId)
    : [];

  onMount(() => {
    registerWindow();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  });

  onDestroy(() => {
    unregisterWindow();
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  });

  function registerWindow() {
    registerWin(configId, config);
  }

  function unregisterWindow() {
    unregisterWin(configId);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Alt") isAltPressed = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === "Alt") isAltPressed = false;
  }

  function onMouseDown(e: MouseEvent) {
    if (isVisible === false) return;
    bringToFront(configId);

    if (
      config.movable &&
      config.hasHeader &&
      (e.target as HTMLElement).closest(".window-header")
    ) {
      startDrag(e);
    }
  }

  function startDrag(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startBounds = { ...currentBounds };

    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
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
      const snap = calculateSnapMove(
        newX,
        newY,
        currentBounds.w,
        currentBounds.h,
        viewport,
        otherWindows,
      );
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

    // ── Drop-target detection: highlight another window's header ──
    setDropTarget(findDropTarget(newX, newY));
  }

  function onDragEnd() {
    isDragging = false;
    snapGuides = [];
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);

    // If overlapping another window's header → group
    const target = $WindowsStore.dropTargetId;
    setDropTarget(null);
    if (target) {
      groupWindows(target, configId);
      return;
    }

    // Update store with final bounds (propagate to group siblings)
    updateWindowConfig(configId, { bounds: currentBounds });
    if (isGrouped) {
      for (const m of groupMembers) {
        if (m.id !== configId) {
          updateWindowConfig(m.id, { bounds: { ...currentBounds } });
        }
      }
    }
  }

  /** Check if our header overlaps another window's header zone (top 32px). */
  function findDropTarget(myX: number, myY: number): string | null {
    const store = get(WindowsStore);
    const headerH = 32;
    for (const w of store.winConfigs) {
      if (w.id === configId) continue;
      if (w.visible === false) continue;
      // Skip windows that are in the same group as us
      if (isGrouped && w.groupId === config.groupId) continue;
      // Check if our top-centre falls within the other window's header zone
      const myCenterX = myX + currentBounds.w / 2;
      const myCenterY = myY + headerH / 2;
      if (
        myCenterX >= w.bounds.x &&
        myCenterX <= w.bounds.x + w.bounds.w &&
        myCenterY >= w.bounds.y &&
        myCenterY <= w.bounds.y + headerH
      ) {
        return w.id;
      }
    }
    return null;
  }

  // ── Tab tear-off handlers ──
  function onTabMouseDown(e: MouseEvent, tabId: string) {
    // Don't start tear for the only remaining tab, or if it's this window itself and not grouped
    if (!isGrouped) return;
    e.stopPropagation();
    e.preventDefault();
    isTearingTab = true;
    tearTabId = tabId;
    tearStartX = e.clientX;
    tearStartY = e.clientY;
    window.addEventListener('mousemove', onTabTearMove);
    window.addEventListener('mouseup', onTabTearEnd);
  }

  function onTabTearMove(e: MouseEvent) {
    if (!isTearingTab || !tearTabId) return;
    const dy = Math.abs(e.clientY - tearStartY);
    const dx = Math.abs(e.clientX - tearStartX);
    if (dy > TEAR_THRESHOLD || dx > TEAR_THRESHOLD) {
      // Tear off!
      const detachId = tearTabId;
      cleanupTabTear();
      ungroupWindow(detachId, { x: e.clientX - 100, y: e.clientY - 16 });
      bringToFront(detachId);
    }
  }

  function onTabTearEnd() {
    // If we didn't exceed threshold, treat as a click → switch tab
    if (isTearingTab && tearTabId && isGrouped) {
      setActiveTab(config.groupId!, tearTabId);
    }
    cleanupTabTear();
  }

  function cleanupTabTear() {
    isTearingTab = false;
    tearTabId = null;
    window.removeEventListener('mousemove', onTabTearMove);
    window.removeEventListener('mouseup', onTabTearEnd);
  }

  // Resize handlers
  function startResize(e: MouseEvent, handle: string) {
    if (!config.resizable) return;
    e.stopPropagation();
    bringToFront(configId);

    isResizing = true;
    resizeHandle = handle;
    startX = e.clientX;
    startY = e.clientY;
    startBounds = { ...currentBounds };

    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  }

  function onResizeMove(e: MouseEvent) {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = startBounds.x;
    let newY = startBounds.y;
    let newW = startBounds.w;
    let newH = startBounds.h;

    // Calculate raw resize first
    if (resizeHandle.includes("e")) newW = startBounds.w + dx;
    if (resizeHandle.includes("w")) {
      newW = startBounds.w - dx;
      newX = startBounds.x + dx;
    }
    if (resizeHandle.includes("s")) newH = startBounds.h + dy;
    if (resizeHandle.includes("n")) {
      newH = startBounds.h - dy;
      newY = startBounds.y + dy;
    }

    // Apply min/max constraints BEFORE snapping
    const limits = config.boundsLimits || {};
    const minW = limits.minW || 100;
    const minH = limits.minH || 100;
    const maxW = limits.maxW || Infinity;
    const maxH = limits.maxH || Infinity;

    // Enforce minimum size
    if (newW < minW) {
      if (resizeHandle.includes("w"))
        newX = startBounds.x + startBounds.w - minW;
      newW = minW;
    }
    if (newH < minH) {
      if (resizeHandle.includes("n"))
        newY = startBounds.y + startBounds.h - minH;
      newH = minH;
    }

    // Enforce maximum size
    newW = Math.min(newW, maxW);
    newH = Math.min(newH, maxH);

    // Snap during resize
    const viewport = getViewportBounds();
    const otherWindows = getOtherWindowsBounds();

    if (!isAltPressed) {
      const snap = calculateSnapResize(
        newX,
        newY,
        newW,
        newH,
        viewport,
        otherWindows,
        resizeHandle,
      );
      newX = snap.x;
      newY = snap.y;
      newW = snap.w;
      newH = snap.h;
      snapGuides = snap.guides;
    } else {
      snapGuides = [];
    }

    // Final viewport clamp
    if (newX < 0) {
      newW += newX;
      newX = 0;
    }
    if (newY < 0) {
      newH += newY;
      newY = 0;
    }
    if (newX + newW > viewport.w) newW = viewport.w - newX;
    if (newY + newH > viewport.h) newH = viewport.h - newY;

    updateBounds({ x: newX, y: newY, w: newW, h: newH });
  }

  function onResizeEnd() {
    isResizing = false;
    resizeHandle = "";
    snapGuides = [];
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);

    updateWindowConfig(configId, { bounds: currentBounds });
    if (isGrouped) {
      for (const m of groupMembers) {
        if (m.id !== configId) {
          updateWindowConfig(m.id, { bounds: { ...currentBounds } });
        }
      }
    }
  }

  function updateBounds(
    bounds: Partial<{ x: number; y: number; w: number; h: number }>,
  ) {
    config = { ...config, bounds: { ...currentBounds, ...bounds } };
  }

  function getViewportBounds() {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function getOtherWindowsBounds() {
    const store = get(WindowsStore);
    return store.winConfigs
      .filter((w) => w.id !== configId)
      .filter((w) => {
        // Skip hidden group members from snap calculations
        if (w.groupId && w.groupId !== '' && !w.activeInGroup) return false;
        return true;
      })
      .map((w) => w.bounds);
  }

  // Separate function for move snapping - simpler, only positions change
  function calculateSnapMove(
    x: number,
    y: number,
    w: number,
    h: number,
    viewport: { w: number; h: number },
    others: { x: number; y: number; w: number; h: number }[],
  ) {
    const guides: Guide[] = [];

    // Snap targets: value = where the edge should be, pos = where to draw guide
    const xSnaps: Array<{ value: number; pos: number; dist: number }> = [];
    const ySnaps: Array<{ value: number; pos: number; dist: number }> = [];

    // Viewport edges
    xSnaps.push({ value: 0, pos: 0, dist: Math.abs(x) });
    xSnaps.push({
      value: viewport.w - w,
      pos: viewport.w,
      dist: Math.abs(viewport.w - w - x),
    });
    ySnaps.push({ value: 0, pos: 0, dist: Math.abs(y) });
    ySnaps.push({
      value: viewport.h - h,
      pos: viewport.h,
      dist: Math.abs(viewport.h - h - y),
    });

    // Other windows
    others.forEach((b) => {
      // Left edge to other's right
      xSnaps.push({
        value: b.x + b.w,
        pos: b.x + b.w,
        dist: Math.abs(b.x + b.w - x),
      });
      // Right edge to other's left
      xSnaps.push({ value: b.x - w, pos: b.x, dist: Math.abs(b.x - w - x) });
      // Horizontal centers
      xSnaps.push({
        value: b.x + b.w / 2 - w / 2,
        pos: b.x + b.w / 2,
        dist: Math.abs(b.x + b.w / 2 - w / 2 - x),
      });

      // Top to other's bottom
      ySnaps.push({
        value: b.y + b.h,
        pos: b.y + b.h,
        dist: Math.abs(b.y + b.h - y),
      });
      // Bottom to other's top
      ySnaps.push({ value: b.y - h, pos: b.y, dist: Math.abs(b.y - h - y) });
      // Vertical centers
      ySnaps.push({
        value: b.y + b.h / 2 - h / 2,
        pos: b.y + b.h / 2,
        dist: Math.abs(b.y + b.h / 2 - h / 2 - y),
      });
    });

    // Find best snaps within threshold
    const bestX = xSnaps
      .filter((s) => s.dist < SNAP_THRESHOLD)
      .sort((a, b) => a.dist - b.dist)[0];
    const bestY = ySnaps
      .filter((s) => s.dist < SNAP_THRESHOLD)
      .sort((a, b) => a.dist - b.dist)[0];

    // Build guides for all snaps at the same position as best snap
    if (bestX) {
      xSnaps
        .filter(
          (s) => Math.abs(s.pos - bestX.pos) < 1 && s.dist < SNAP_THRESHOLD,
        )
        .forEach((s) => {
          if (
            !guides.find((g) => g.type === "x" && Math.abs(g.pos - s.pos) < 1)
          ) {
            guides.push({ type: "x", value: s.value, pos: s.pos });
          }
        });
    }

    if (bestY) {
      ySnaps
        .filter(
          (s) => Math.abs(s.pos - bestY.pos) < 1 && s.dist < SNAP_THRESHOLD,
        )
        .forEach((s) => {
          if (
            !guides.find((g) => g.type === "y" && Math.abs(g.pos - s.pos) < 1)
          ) {
            guides.push({ type: "y", value: s.value, pos: s.pos });
          }
        });
    }

    return {
      x: bestX ? bestX.value : x,
      y: bestY ? bestY.value : y,
      guides,
    };
  }

  // Separate function for resize snapping - handles edge-specific logic correctly
  function calculateSnapResize(
    x: number,
    y: number,
    w: number,
    h: number,
    viewport: { w: number; h: number },
    others: { x: number; y: number; w: number; h: number }[],
    handle: string,
  ) {
    const guides: Guide[] = [];
    let snapX = x;
    let snapY = y;
    let snapW = w;
    let snapH = h;

    // Track which edges are being resized
    const resizingLeft = handle.includes("w");
    const resizingRight = handle.includes("e");
    const resizingTop = handle.includes("n");
    const resizingBottom = handle.includes("s");

    // X-axis snapping (left/right edges)
    if (resizingLeft || resizingRight) {
      const edgeSnaps: Array<{
        edge: "left" | "right";
        currentPos: number;
        targetPos: number;
        dist: number;
        newX: number;
        newW: number;
      }> = [];

      // Current edge positions
      const currentLeft = x;
      const currentRight = x + w;

      // Viewport edges
      if (resizingLeft) {
        edgeSnaps.push({
          edge: "left",
          currentPos: currentLeft,
          targetPos: 0,
          dist: Math.abs(currentLeft),
          newX: 0,
          newW: w + (x - 0), // Expand width by moving left
        });
      }
      if (resizingRight) {
        edgeSnaps.push({
          edge: "right",
          currentPos: currentRight,
          targetPos: viewport.w,
          dist: Math.abs(viewport.w - currentRight),
          newX: x,
          newW: viewport.w - x,
        });
      }

      // Other windows edges
      others.forEach((b) => {
        const otherLeft = b.x;
        const otherRight = b.x + b.w;

        if (resizingLeft) {
          // Snap left edge to other's right
          edgeSnaps.push({
            edge: "left",
            currentPos: currentLeft,
            targetPos: otherRight,
            dist: Math.abs(otherRight - currentLeft),
            newX: otherRight,
            newW: w + (x - otherRight),
          });
          // Snap left edge to other's left
          edgeSnaps.push({
            edge: "left",
            currentPos: currentLeft,
            targetPos: otherLeft,
            dist: Math.abs(otherLeft - currentLeft),
            newX: otherLeft,
            newW: w + (x - otherLeft),
          });
        }

        if (resizingRight) {
          // Snap right edge to other's left
          edgeSnaps.push({
            edge: "right",
            currentPos: currentRight,
            targetPos: otherLeft,
            dist: Math.abs(otherLeft - currentRight),
            newX: x,
            newW: otherLeft - x,
          });
          // Snap right edge to other's right
          edgeSnaps.push({
            edge: "right",
            currentPos: currentRight,
            targetPos: otherRight,
            dist: Math.abs(otherRight - currentRight),
            newX: x,
            newW: otherRight - x,
          });
        }
      });

      // Find best X snap
      const validSnaps = edgeSnaps.filter((s) => s.dist < SNAP_THRESHOLD);
      if (validSnaps.length > 0) {
        const best = validSnaps.sort((a, b) => a.dist - b.dist)[0];
        snapX = best.newX;
        snapW = best.newW;

        // Add guide at the target position
        const guidePos = best.edge === "left" ? best.targetPos : best.targetPos;
        if (
          !guides.find((g) => g.type === "x" && Math.abs(g.pos - guidePos) < 1)
        ) {
          guides.push({ type: "x", value: snapX, pos: guidePos });
        }
      }
    }

    // Y-axis snapping (top/bottom edges)
    if (resizingTop || resizingBottom) {
      const edgeSnaps: Array<{
        edge: "top" | "bottom";
        currentPos: number;
        targetPos: number;
        dist: number;
        newY: number;
        newH: number;
      }> = [];

      const currentTop = y;
      const currentBottom = y + h;

      // Viewport edges
      if (resizingTop) {
        edgeSnaps.push({
          edge: "top",
          currentPos: currentTop,
          targetPos: 0,
          dist: Math.abs(currentTop),
          newY: 0,
          newH: h + (y - 0),
        });
      }
      if (resizingBottom) {
        edgeSnaps.push({
          edge: "bottom",
          currentPos: currentBottom,
          targetPos: viewport.h,
          dist: Math.abs(viewport.h - currentBottom),
          newY: y,
          newH: viewport.h - y,
        });
      }

      // Other windows edges
      others.forEach((b) => {
        const otherTop = b.y;
        const otherBottom = b.y + b.h;

        if (resizingTop) {
          edgeSnaps.push({
            edge: "top",
            currentPos: currentTop,
            targetPos: otherBottom,
            dist: Math.abs(otherBottom - currentTop),
            newY: otherBottom,
            newH: h + (y - otherBottom),
          });
          edgeSnaps.push({
            edge: "top",
            currentPos: currentTop,
            targetPos: otherTop,
            dist: Math.abs(otherTop - currentTop),
            newY: otherTop,
            newH: h + (y - otherTop),
          });
        }

        if (resizingBottom) {
          edgeSnaps.push({
            edge: "bottom",
            currentPos: currentBottom,
            targetPos: otherTop,
            dist: Math.abs(otherTop - currentBottom),
            newY: y,
            newH: otherTop - y,
          });
          edgeSnaps.push({
            edge: "bottom",
            currentPos: currentBottom,
            targetPos: otherBottom,
            dist: Math.abs(otherBottom - currentBottom),
            newY: y,
            newH: otherBottom - y,
          });
        }
      });

      // Find best Y snap
      const validSnaps = edgeSnaps.filter((s) => s.dist < SNAP_THRESHOLD);
      if (validSnaps.length > 0) {
        const best = validSnaps.sort((a, b) => a.dist - b.dist)[0];
        snapY = best.newY;
        snapH = best.newH;

        const guidePos = best.targetPos;
        if (
          !guides.find((g) => g.type === "y" && Math.abs(g.pos - guidePos) < 1)
        ) {
          guides.push({ type: "y", value: snapY, pos: guidePos });
        }
      }
    }

    return { x: snapX, y: snapY, w: snapW, h: snapH, guides };
  }
</script>

{#if isVisible !== false && (!isGrouped || isActiveTab)}
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
      {#if isGrouped}
        <!-- Tab bar for grouped windows -->
        <div class="window-header tab-header">
          <button
            type="button"
            class="tab-drag-handle"
            aria-label="Drag grouped window"
            on:mousedown={(e) => { e.stopPropagation(); startDrag(e); }}
          >≡</button>
          {#each groupMembers as member (member.id)}
            <button
              type="button"
              class="tab-button"
              class:tab-active={member.activeInGroup}
              on:mousedown={(e) => onTabMouseDown(e, member.id)}
            >{member.title}</button>
          {/each}
        </div>
      {:else}
        <div class="window-header">
          <span class="window-title">{config.title}</span>
        </div>
      {/if}
    {/if}

    <div class="window-content">
      <slot />
    </div>

    {#if config.resizable}
      <button
        type="button"
        class="resize-handle n"
        aria-label="Resize North"
        on:mousedown={(e) => startResize(e, "n")}
      ></button>
      <button
        type="button"
        class="resize-handle s"
        aria-label="Resize South"
        on:mousedown={(e) => startResize(e, "s")}
      ></button>
      <button
        type="button"
        class="resize-handle e"
        aria-label="Resize East"
        on:mousedown={(e) => startResize(e, "e")}
      ></button>
      <button
        type="button"
        class="resize-handle w"
        aria-label="Resize West"
        on:mousedown={(e) => startResize(e, "w")}
      ></button>
      <button
        type="button"
        class="resize-handle ne"
        aria-label="Resize North East"
        on:mousedown={(e) => startResize(e, "ne")}
      ></button>
      <button
        type="button"
        class="resize-handle nw"
        aria-label="Resize North West"
        on:mousedown={(e) => startResize(e, "nw")}
      ></button>
      <button
        type="button"
        class="resize-handle se"
        aria-label="Resize South East"
        on:mousedown={(e) => startResize(e, "se")}
      ></button>
      <button
        type="button"
        class="resize-handle sw"
        aria-label="Resize South West"
        on:mousedown={(e) => startResize(e, "sw")}
      ></button>
    {/if}
  </div>

  <!-- Snap guides - positioned at the actual snap target location -->
  {#each snapGuides as guide}
    <div
      class="snap-guide"
      class:vertical={guide.type === "x"}
      class:horizontal={guide.type === "y"}
      style={guide.type === "x"
        ? `left: ${guide.pos}px; top: 0; height: 100vh;`
        : `top: ${guide.pos}px; left: 0; width: 100vw;`}
    ></div>
  {/each}
{/if}

<!-- Drop-target highlight: rendered by ALL windows, visible only on the target -->
{#if $WindowsStore.winConfigs.find(w => w.id === configId)}
  <div
    class="drop-target-highlight"
    class:visible={$WindowsStore.dropTargetId === configId}
    style="
      left: {currentBounds.x}px;
      top: {currentBounds.y}px;
      width: {currentBounds.w}px;
      height: 32px;
      z-index: 9998;
    "
  ></div>
{/if}

<style>
  .window {
    position: absolute;
    background: #00000000;
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
    justify-content: center;
    padding: 0 12px;
    cursor: default;
    user-select: none;
  }

  /* ── Tab bar header ── */
  .tab-header {
    justify-content: flex-start;
    gap: 4px;
    padding: 0 6px;
  }

  .tab-drag-handle {
    background: none;
    border: none;
    color: #888;
    font-size: 16px;
    cursor: grab;
    padding: 0 6px;
    line-height: 32px;
    user-select: none;
    flex-shrink: 0;
  }

  .tab-drag-handle:hover {
    color: #ccc;
  }

  .tab-drag-handle:active {
    cursor: grabbing;
  }

  .tab-button {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    color: #999;
    font-size: 12px;
    font-weight: 500;
    padding: 2px 12px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition: all 0.15s ease;
    line-height: 22px;
  }

  .tab-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
  }

  .tab-button.tab-active {
    background: rgba(74, 158, 255, 0.25);
    border-color: rgba(74, 158, 255, 0.5);
    color: #e0e0e0;
  }

  .window-title {
    font-size: 13px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .window-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .resize-handle {
    position: absolute;
    z-index: 10;
    background: transparent;
    border: none;
    padding: 0;
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
    box-shadow: 0 0 4px rgba(74, 158, 255, 0.5);
  }

  .snap-guide.vertical {
    width: 1px;
    top: 0;
    bottom: 0;
  }

  .snap-guide.horizontal {
    height: 1px;
    left: 0;
    right: 0;
  }

  /* ── Drop-target highlight ── */
  .drop-target-highlight {
    position: absolute;
    pointer-events: none;
    border-radius: 8px 8px 0 0;
    border: 2px solid rgba(74, 158, 255, 0.8);
    background: rgba(74, 158, 255, 0.15);
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.4);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .drop-target-highlight.visible {
    opacity: 1;
  }
</style>
