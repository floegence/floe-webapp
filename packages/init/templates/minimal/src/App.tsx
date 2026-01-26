import { ActivityAppsMain, FloeApp, Files, type FloeComponent } from '@floegence/floe-webapp-core';

const HomePage = () => (
  <div class="flex h-full items-center justify-center">
    <div class="text-center">
      <h1 class="text-lg font-semibold text-foreground">Welcome to Floe</h1>
      <p class="mt-1 text-xs text-muted-foreground">Start building your app</p>
    </div>
  </div>
);

const components: FloeComponent[] = [
  {
    id: 'home',
    name: 'Home',
    icon: Files,
    description: 'Home page',
    component: HomePage,
    sidebar: { order: 0, fullScreen: true },
    commands: [
      {
        id: 'home.open',
        title: 'Go to Home',
        category: 'Navigation',
        execute: (ctx) => ctx.layout.setSidebarActiveTab('home'),
      },
    ],
  },
];

export default function App() {
  return (
    <FloeApp
      components={components}
      config={{
        layout: {
          sidebar: { defaultActiveTab: 'home' },
        },
      }}
    >
      <ActivityAppsMain />
    </FloeApp>
  );
}
