import { type Component } from 'solid-js';
import { cn } from '../../../utils/cn';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConnectionStatusProps {
  state: ConnectionState;
  class?: string;
}

export const ConnectionStatus: Component<ConnectionStatusProps> = (props) => {
  const getStatusInfo = () => {
    switch (props.state) {
      case 'connecting':
        return { label: 'Connecting...', color: 'text-yellow-500' };
      case 'connected':
        return { label: 'Connected', color: 'text-green-500' };
      case 'disconnected':
        return { label: 'Disconnected', color: 'text-muted-foreground' };
      case 'error':
        return { label: 'Connection Error', color: 'text-red-500' };
      default:
        return { label: 'Unknown', color: 'text-muted-foreground' };
    }
  };

  const info = () => getStatusInfo();

  return (
    <div class={cn('chat-connection-status', info().color, props.class)}>
      <span
        class={cn(
          'chat-connection-dot',
          props.state === 'connecting' && 'animate-pulse'
        )}
      />
      <span class="chat-connection-label">{info().label}</span>
    </div>
  );
};
