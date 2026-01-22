import { Show } from 'solid-js';
import { Button, useTheme, useNotification, Sun, Moon } from '@floegence/floe-webapp-core';
import { useProtocol, type ConnectConfig } from '@floegence/floe-webapp-protocol';

export function SettingsPanel() {
  const theme = useTheme();
  const notifications = useNotification();
  const protocol = useProtocol();

  const connect = async () => {
    const baseUrl = import.meta.env.VITE_FLOE_CONTROLPLANE_BASE_URL;
    const endpointId = import.meta.env.VITE_FLOE_ENDPOINT_ID;

    if (!baseUrl || !endpointId) {
      notifications.warning(
        'Missing protocol config',
        'Set VITE_FLOE_CONTROLPLANE_BASE_URL and VITE_FLOE_ENDPOINT_ID in your environment.'
      );
      return;
    }

    try {
      const config: ConnectConfig = {
        mode: 'tunnel',
        controlplane: { baseUrl, endpointId },
      };
      await protocol.connect(config);
      notifications.success('Connected', 'Flowersec tunnel established.');
    } catch (e) {
      notifications.error('Connection failed', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div class="p-2.5 space-y-3">
      <div>
        <h3 class="text-xs font-medium mb-1.5">Connection</h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">Status: {protocol.status()}</span>
          <Button
            size="sm"
            variant={protocol.status() === 'connected' ? 'outline' : 'default'}
            disabled={protocol.status() === 'connecting'}
            onClick={() => {
              if (protocol.status() === 'connected') {
                protocol.disconnect();
                notifications.info('Disconnected', 'Connection closed.');
              } else {
                void connect();
              }
            }}
          >
            {protocol.status() === 'connected' ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
        <p class="mt-1.5 text-[11px] text-muted-foreground">
          Configure with <code class="font-mono">VITE_FLOE_CONTROLPLANE_BASE_URL</code> and{' '}
          <code class="font-mono">VITE_FLOE_ENDPOINT_ID</code>.
        </p>
        <Show when={protocol.error()}>
          <p class="mt-1.5 text-[11px] text-error">{protocol.error()?.message}</p>
        </Show>
      </div>

      <div>
        <h3 class="text-xs font-medium mb-1.5">Appearance</h3>
        <div class="flex gap-1.5">
          <Button
            variant={theme.resolvedTheme() === 'light' ? 'default' : 'outline'}
            size="sm"
            icon={Sun}
            onClick={() => theme.setTheme('light')}
          >
            Light
          </Button>
          <Button
            variant={theme.resolvedTheme() === 'dark' ? 'default' : 'outline'}
            size="sm"
            icon={Moon}
            onClick={() => theme.setTheme('dark')}
          >
            Dark
          </Button>
        </div>
      </div>
    </div>
  );
}

