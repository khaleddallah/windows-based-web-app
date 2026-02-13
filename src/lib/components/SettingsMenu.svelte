<script lang="ts">
    import {
        Settings,
        Palette,
        LayoutTemplate,
        AppWindow,
        Check,
    } from "lucide-svelte";
    import { type WinConfig } from "$lib/types/winConfig";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {
        setTheme,
        getTheme,
        THEMES,
        type Theme,
    } from "$lib/core/ThemeSwitcher";
    import { WindowsStore, updateWindowConfig } from "$lib/core/WindowsStore";
    import { onMount, getContext } from "svelte";

    let currentTheme: Theme = $state("light");
    let fileInput: HTMLInputElement;

    function handleThemeChange(newTheme: Theme) {
        setTheme(newTheme);
        currentTheme = newTheme;
    }

    function toggleWindowVisibility(id: string, currentVisible?: boolean) {
        // If undefined, it means it's currently visible (default), so toggle to false
        const newVisible = currentVisible === false ? true : false;
        updateWindowConfig(id, { visible: newVisible });
    }

    const exportLayout = () => {
        const configs = $WindowsStore.winConfigs;
        const json = JSON.stringify(configs, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "layout-config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importLayout = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const configs = JSON.parse(e.target?.result as string) as WinConfig[];
                // Basic validation: check if array
                if (!Array.isArray(configs)) {
                    console.error("Invalid layout file format: expected array");
                    return;
                }
                
                // Update each window config using updateWindowConfig
                for (const config of configs) {
                    if (config.id) {
                        const { id, ...rest } = config;
                        updateWindowConfig(id, rest);
                    }
                }

            } catch (err) {
                console.error("Failed to parse layout file", err);
            }
        };
        reader.readAsText(file);
        // Reset file input
        target.value = '';
    };

    onMount(() => {
        currentTheme = getTheme();
    });
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger class="outline-none">
        <button
            class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
            aria-label="Settings"
        >
            <Settings class="h-5 w-5" />
        </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="w-56">
        <DropdownMenu.Label>Settings</DropdownMenu.Label>
        <DropdownMenu.Separator />

        <!-- Themes -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <Palette class="mr-2 h-4 w-4" />
                <span>Themes</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.RadioGroup value={currentTheme}>
                    {#each THEMES as theme}
                        <DropdownMenu.RadioItem
                            value={theme}
                            onclick={() => handleThemeChange(theme)}
                        >
                            <span class="capitalize">{theme}</span>
                        </DropdownMenu.RadioItem>
                    {/each}
                </DropdownMenu.RadioGroup>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <!-- Layout -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <LayoutTemplate class="mr-2 h-4 w-4" />
                <span>Layout</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.Item onclick={() => fileInput.click()}>
                    Import
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={exportLayout}>
                    Export
                </DropdownMenu.Item>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <!-- Window List -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <AppWindow class="mr-2 h-4 w-4" />
                <span>Window</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                {#each $WindowsStore.winConfigs as config}
                    <DropdownMenu.CheckboxItem
                        checked={config.visible !== false}
                        onclick={(e) => {
                            e.preventDefault();
                            toggleWindowVisibility(config.id, config.visible);
                        }}
                    >
                        {config.title}
                    </DropdownMenu.CheckboxItem>
                {/each}
                {#if $WindowsStore.winConfigs.length === 0}
                    <DropdownMenu.Item disabled
                        >No windows open</DropdownMenu.Item
                    >
                {/if}
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
    </DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Hidden file input for import - must be outside DropdownMenu so it persists in the DOM -->
<input
    bind:this={fileInput}
    type="file"
    accept=".json"
    class="hidden"
    onchange={importLayout}
/>
