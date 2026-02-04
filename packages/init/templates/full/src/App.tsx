import type { FloeComponent } from '@floegence/floe-webapp-core';
import { ActivityAppsMain, FloeApp } from '@floegence/floe-webapp-core/app';
import { Files, Settings } from '@floegence/floe-webapp-core/icons';
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
        category: 'Navigation',
        execute: (ctx) => ctx.layout.setSidebarActiveTab('home'),
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
        category: 'Navigation',
        execute: (ctx) => ctx.layout.setSidebarActiveTab('settings'),
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
