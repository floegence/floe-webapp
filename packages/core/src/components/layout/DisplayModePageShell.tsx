import { type Component, type JSX } from 'solid-js';
import { TopBar } from './TopBar';

export interface DisplayModePageShellProps {
  logo?: JSX.Element;
  actions?: JSX.Element;
  title?: string;
  children: JSX.Element;
}

export const DisplayModePageShell: Component<DisplayModePageShellProps> = (props) => {
  return (
    <div class="display-mode-page-shell">
      <TopBar
        logo={props.logo}
        title={props.title}
        actions={props.actions}
        ariaLabel="Display mode top bar"
      />
      <main class="display-mode-page-shell__body">{props.children}</main>
    </div>
  );
};
