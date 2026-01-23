import {
  FloeApp,
  Files,
  Settings,
  useLayout,
  type FloeComponent,
} from '@floegence/floe-webapp-core';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';

// Component definitions for the sidebar and command palette
// Components are rendered in the sidebar; use fullScreen: true for main content
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
        handler: ({ setActive }) => setActive('home'),
      },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    description: 'Application settings',
    component: SettingsPage,
    sidebar: { order: 100, fullScreen: true },
    commands: [
      {
        id: 'settings.open',
        title: 'Open Settings',
        handler: ({ setActive }) => setActive('settings'),
      },
    ],
  },
];

// Content switcher based on active component
function AppContent() {
  const layout = useLayout();

  return (
    <>
      {layout.sidebarActiveTab() === 'home' && <HomePage />}
      {layout.sidebarActiveTab() === 'settings' && <SettingsPage />}
    </>
  );
}

export default function App() {
  return (
    <FloeApp components={components}>
      <AppContent />
    </FloeApp>
  );
}
