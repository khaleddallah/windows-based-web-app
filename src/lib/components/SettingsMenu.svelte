<script lang="ts">
    import {
        Settings,
        Palette,
        LayoutTemplate,
        AppWindow,
        Check,
    } from "lucide-svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {
        setTheme,
        getTheme,
        THEMES,
        type Theme,
    } from "$lib/core/ThemeSwitcher";
    import { onMount } from "svelte";

    let currentTheme: Theme = $state("light");

    function handleThemeChange(newTheme: Theme) {
        setTheme(newTheme);
        currentTheme = newTheme;
    }

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

        <!-- Layout (Placeholder) -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled>
                <LayoutTemplate class="mr-2 h-4 w-4" />
                <span>Layout</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.Item>Default</DropdownMenu.Item>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <!-- Window (Placeholder) -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled>
                <AppWindow class="mr-2 h-4 w-4" />
                <span>Window</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.Item>Default</DropdownMenu.Item>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
    </DropdownMenu.Content>
</DropdownMenu.Root>
