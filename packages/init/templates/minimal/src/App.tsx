import { FloeApp, Files, type FloeComponent } from '@floegence/floe-webapp-core';

const HomePage = () => (
  <div class="flex h-full items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-foreground">Welcome to Floe</h1>
      <p class="mt-2 text-muted-foreground">Start building your app</p>
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
    sidebar: { order: 0 },
  },
];

export default function App() {
  return (
    <FloeApp components={components}>
      <HomePage />
    </FloeApp>
  );
}
