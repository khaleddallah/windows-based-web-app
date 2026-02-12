<script>
  import Window from '$lib/components/Window.svelte';
  import { registerWindow } from '$lib/core/WindowsStore';
  import { AppStore } from '$lib/core/AppStore';
  import { EventBus } from '$lib/core/EventBus';
  import { onMount } from 'svelte';

  // AppStore test
  const appStore = new AppStore();
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

  import windowsConfig from '../../../windows.config.json';
  const myConfig = windowsConfig[0];
  const myConfig2 = windowsConfig[1];
</script>

<div class="p-4 space-y-4">
	<Window config={myConfig} zIndex={1}>
	  <h2 class="text-lg font-bold">AppStore Test</h2>
	  <button class="bg-wm-accent px-2 py-1 rounded" on:click={setStoreValue}>Set Store Value</button>
	  <h2 class="text-lg font-bold mt-6">EventBus Test</h2>
	  <button class="bg-wm-accent px-2 py-1 rounded" on:click={sendEvent}>Emit Event</button>
	</Window>
	<Window config={myConfig2} zIndex={1}>
	  <h2 class="text-lg font-bold">AppStore Test</h2>
	  <div>Store value: {storeValue}</div>
	  <h2 class="text-lg font-bold mt-6">EventBus Test</h2>
    <div>Event message: {eventMsg}</div>
    </Window>
  </div>
