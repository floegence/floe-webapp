import type { Component } from 'solid-js';
import { WorkbenchSurface } from '@floegence/floe-webapp-core/workbench';
import { useWorkbenchDemo } from './WorkbenchDemoContext';

/**
 * Workbench display-mode page.
 *
 * Mounted directly inside DisplayModePageShell — there is no modal frame and
 * no portal: this is a permanent display surface, not a transient overlay.
 */
export const WorkbenchPage: Component = () => {
  const demo = useWorkbenchDemo();
  return <WorkbenchSurface state={demo.state} setState={demo.setState} />;
};
