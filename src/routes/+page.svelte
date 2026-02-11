<script>
  import Window from '$lib/components/Window.svelte';
  import { registerWindow } from '$lib/core/WindowsStore';
  
  const myConfig = {
    title: 'My Window',
    bounds: { x: 100, y: 100, w: 400, h: 300 },
    boundsLimits: { minW: 200, minH: 150 },
    hasHeader: true,
    movable: true,
    resizable: true
  };

   const myConfig2 = {
    title: 'My Window2',
    bounds: { x: 100, y: 100, w: 400, h: 300 },
    boundsLimits: { minW: 200, minH: 150 },
    hasHeader: false,
    movable: true,
    resizable: true
  };
</script>

<Window windowId="win-1" config={myConfig} zIndex={1}>
  <p>Window content here</p>
</Window>

<Window windowId="win-2" config={myConfig2} zIndex={1}>
  <p>Window content here</p>
</Window>