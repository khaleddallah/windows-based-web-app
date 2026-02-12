<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import { initTheme } from "$lib/core/ThemeSwitcher";
    import SettingsMenu from "$lib/components/SettingsMenu.svelte";

    let { children } = $props();

    onMount(() => {
        initTheme();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<!-- Fixed settings button in top-right -->
<div class="fixed top-4 right-4 z-50">
    <SettingsMenu />
</div>

{@render children()}
