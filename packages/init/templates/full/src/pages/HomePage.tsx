export function HomePage() {
  return (
    <div class="flex h-full items-center justify-center">
      <div class="text-center">
        <h1 class="text-lg font-semibold text-foreground">Welcome to Floe</h1>
        <p class="mt-1 text-xs text-muted-foreground">A feature-rich starter template</p>
        <div class="mt-6 flex justify-center gap-4">
          <div class="rounded-lg border border-border bg-card p-4">
            <h3 class="text-sm font-medium text-foreground">Components</h3>
            <p class="mt-1 text-xs text-muted-foreground">Pre-built UI components</p>
          </div>
          <div class="rounded-lg border border-border bg-card p-4">
            <h3 class="text-sm font-medium text-foreground">Commands</h3>
            <p class="mt-1 text-xs text-muted-foreground">Press Cmd+K to open</p>
          </div>
          <div class="rounded-lg border border-border bg-card p-4">
            <h3 class="text-sm font-medium text-foreground">Themes</h3>
            <p class="mt-1 text-xs text-muted-foreground">Light and dark mode</p>
          </div>
        </div>
      </div>
    </div>
  );
}
