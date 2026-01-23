import { Button, useTheme, Sun, Moon } from '@floegence/floe-webapp-core';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div class="h-full overflow-auto p-6">
      <h1 class="text-lg font-semibold text-foreground">Settings</h1>
      <p class="mt-1 text-xs text-muted-foreground">Manage your application preferences</p>

      <div class="mt-6 space-y-6">
        {/* Theme Section */}
        <section class="rounded-lg border border-border bg-card p-4">
          <h2 class="text-sm font-medium text-foreground">Appearance</h2>
          <p class="mt-1 text-xs text-muted-foreground">Customize how the app looks</p>

          <div class="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              icon={Sun}
              variant={theme() === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              size="sm"
              icon={Moon}
              variant={theme() === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
            <Button
              size="sm"
              variant={theme() === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
            >
              System
            </Button>
          </div>
        </section>

        {/* About Section */}
        <section class="rounded-lg border border-border bg-card p-4">
          <h2 class="text-sm font-medium text-foreground">About</h2>
          <p class="mt-1 text-xs text-muted-foreground">Application information</p>

          <div class="mt-4 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Version</span>
              <span class="text-foreground">0.0.0</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Framework</span>
              <span class="text-foreground">Floe Webapp</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
