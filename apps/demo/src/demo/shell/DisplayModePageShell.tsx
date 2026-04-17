import { type JSX, type Component } from 'solid-js';
import { TopBar } from '@floegence/floe-webapp-core/layout';

export interface DisplayModePageShellProps {
  /** Logo node rendered in the top-bar leading slot. */
  logo?: JSX.Element;
  /** Right-side action nodes (mode switcher, theme toggle, etc). */
  actions?: JSX.Element;
  /** Optional page label rendered next to the logo. */
  title?: string;
  /** Body content — fills the remainder of the viewport. */
  children: JSX.Element;
}

/**
 * Page-mode shell used by Deck and Workbench display modes.
 *
 * Renders only the shared top-bar (logo + mode switcher + theme toggle) and
 * fills the remaining viewport with the page body. Explicitly does NOT render
 * the activity bar or sidebar — those are exclusive to Activity mode.
 */
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
