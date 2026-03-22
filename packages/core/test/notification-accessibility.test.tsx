import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { NotificationContainer, NotificationProvider, useNotification } from '../src/context/NotificationContext';

function renderNotification(kind: 'info' | 'error'): string {
  function Harness() {
    const notify = useNotification();
    if (kind === 'info') {
      notify.info('Saved', 'All changes are synced.');
    } else {
      notify.error('Failed', 'The operation could not be completed.');
    }
    return <NotificationContainer />;
  }

  return renderToString(() => (
    <NotificationProvider>
      <Harness />
    </NotificationProvider>
  ));
}

describe('Notification accessibility', () => {
  it('uses a polite status live region for informational notifications', () => {
    const html = renderNotification('info');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('uses an assertive alert live region for error notifications', () => {
    const html = renderNotification('error');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });
});
