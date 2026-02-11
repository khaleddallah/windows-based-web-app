<script>
  import Window from '$lib/components/Window.svelte';
  import { registerWindow } from '$lib/core/WindowsStore';
  import { createAppStore } from '$lib/core/AppStore';
  import { EventBus } from '$lib/core/EventBus';
  import { onMount } from 'svelte';

  // AppStore test
  const appStore = createAppStore();
  let storeValue = '';
  function setStoreValue() {
    appStore.set('testKey', 'Hello from AppStore!');
  }
  const unsubscribe = appStore.subscribe('testKey', v => { storeValue = v; });

  // EventBus test
  const eventBus = new EventBus();
  let eventMsg = '';
  function sendEvent() {
    eventBus.emit('test:event', 'Hello from EventBus!');
  }
  /** @type {() => void} */
  let unsubEvent = () => {};
  onMount(() => {
    unsubEvent = eventBus.on('test:event', (msg) => { eventMsg = msg; });
    return () => { unsubscribe(); unsubEvent(); };
  });

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
    hasHeader: true,
    movable: true,
    resizable: true
  };
</script>

<div class="p-4 space-y-4">
	<Window windowId="win-1" config={myConfig} zIndex={1}>
	  <h2 class="text-lg font-bold">AppStore Test</h2>
	  <button class="bg-wm-accent px-2 py-1 rounded" on:click={setStoreValue}>Set Store Value</button>
	  <h2 class="text-lg font-bold mt-6">EventBus Test</h2>
	  <button class="bg-wm-accent px-2 py-1 rounded" on:click={sendEvent}>Emit Event</button>
	</Window>
	<Window windowId="win-2" config={myConfig2} zIndex={1}>
	  <h2 class="text-lg font-bold">AppStore Test</h2>
	  <div>Store value: {storeValue}</div>
	  <h2 class="text-lg font-bold mt-6">EventBus Test</h2>
    <div>Event message: {eventMsg}</div>
    </Window>
  </div>
