import { createSignal, type Component } from 'solid-js';
import {
  Launchpad,
  type LaunchpadItemData,
  Files,
  Search,
  Settings,
  Terminal,
  Grid,
  Bell,
  Moon,
  Sun,
  GitBranch,
  useLayout,
  useNotification,
} from '@floegence/floe-webapp-core';

export interface LaunchpadPageProps {
  onClose?: () => void;
  onNavigate?: (componentId: string) => void;
}

export function LaunchpadPage(props: LaunchpadPageProps) {
  const layout = useLayout();
  const notifications = useNotification();
  const [isOpen, setIsOpen] = createSignal(true);

  // Demo apps with various colors
  const demoApps: LaunchpadItemData[] = [
    {
      id: 'showcase',
      name: 'Showcase',
      icon: Terminal,
      description: 'View all UI components',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('showcase');
        handleClose();
      },
    },
    {
      id: 'files',
      name: 'Files',
      icon: Files,
      description: 'Browse project files',
      color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('files');
        handleClose();
      },
    },
    {
      id: 'search',
      name: 'Search',
      icon: Search,
      description: 'Search the workspace',
      color: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('search');
        handleClose();
      },
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Configure preferences',
      color: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('settings');
        handleClose();
      },
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Bell,
      description: 'View notifications',
      color: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
      onClick: () => {
        notifications.info('Notifications', 'No new notifications');
        handleClose();
      },
    },
    {
      id: 'theme-light',
      name: 'Light Mode',
      icon: Sun,
      description: 'Switch to light theme',
      color: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    },
    {
      id: 'theme-dark',
      name: 'Dark Mode',
      icon: Moon,
      description: 'Switch to dark theme',
      color: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    },
    {
      id: 'git',
      name: 'Git',
      icon: GitBranch,
      description: 'Version control',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Grid,
      description: 'Overview dashboard',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    // Add more demo apps to showcase pagination
    {
      id: 'analytics',
      name: 'Analytics',
      icon: Terminal,
      description: 'View analytics',
      color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Grid,
      description: 'Schedule and events',
      color: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: Bell,
      description: 'Chat and messaging',
      color: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    },
  ];

  const handleClose = () => {
    setIsOpen(false);
    props.onClose?.();
  };

  const handleItemClick = (item: LaunchpadItemData) => {
    notifications.success('Launched', `Opening ${item.name}`);
    props.onNavigate?.(item.id);
  };

  return (
    <div class="relative w-full h-full">
      {isOpen() && (
        <Launchpad
          items={demoApps}
          onItemClick={handleItemClick}
          onClose={handleClose}
          itemsPerPage={12}
          columns={4}
          showSearch={true}
        />
      )}
    </div>
  );
}

// Standalone Launchpad overlay component for use as a modal
export const LaunchpadOverlay: Component<{
  open: boolean;
  onClose: () => void;
  onNavigate?: (componentId: string) => void;
}> = (props) => {
  const layout = useLayout();
  const notifications = useNotification();

  const apps: LaunchpadItemData[] = [
    {
      id: 'showcase',
      name: 'Showcase',
      icon: Terminal,
      description: 'View all UI components',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('showcase');
        props.onClose();
      },
    },
    {
      id: 'files',
      name: 'Files',
      icon: Files,
      description: 'Browse project files',
      color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('files');
        props.onClose();
      },
    },
    {
      id: 'search',
      name: 'Search',
      icon: Search,
      description: 'Search the workspace',
      color: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('search');
        props.onClose();
      },
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Configure preferences',
      color: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
      onClick: () => {
        layout.setSidebarActiveTab('settings');
        props.onClose();
      },
    },
  ];

  return (
    <>
      {props.open && (
        <Launchpad
          items={apps}
          onItemClick={(item) => {
            notifications.success('Launched', `Opening ${item.name}`);
            props.onNavigate?.(item.id);
          }}
          onClose={props.onClose}
          itemsPerPage={20}
          columns={5}
        />
      )}
    </>
  );
};
