const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants.js';

type TrackableSocket = {
  emit: Function;
  id?: string;
  listeners?(event: string): Function[];
};

function getListenerCount(client: TrackableSocket, event: string) {
logger.debug(`>>> Entering getListenerCount(client=${client},event=${event})`);
logger.debug(`<<< Exiting getListenerCount(client=${client},event=${event})`);
  return client.listeners?.(event).length ?? 0;
}

@Injectable()
export class SocketLifecycleTracker {
  private latestDisconnectState:
    | {
        stateListeners: number;
        disconnectListeners: number;
        hasRequestContextId: boolean;
      }
    | undefined;

  public reset() {
	logger.debug('>>> Entering reset()');
    this.latestDisconnectState = undefined;
	logger.debug(`reset(): this.latestDisconnectState → ${this.latestDisconnectState}`);
  }

  public recordDisconnect(client: TrackableSocket) {
	logger.debug(`>>> Entering recordDisconnect(client=${client})`);
    this.latestDisconnectState = {
      stateListeners: getListenerCount(client, 'state'),
      disconnectListeners: getListenerCount(client, 'disconnect'),
      hasRequestContextId: REQUEST_CONTEXT_ID in client,
    };
	logger.debug(`recordDisconnect(client=${client}): this.latestDisconnectState → ${this.latestDisconnectState}`);
  }

  public getDisconnectState() {
	logger.debug('>>> Entering getDisconnectState()');
	logger.debug('<<< Exiting getDisconnectState()');
    return this.latestDisconnectState;
  }
}

@Injectable({ scope: Scope.REQUEST })
export class ConnectionStateService {
  private static nextId = 0;

  private readonly instanceId = ++ConnectionStateService.nextId;
  private sequence = 0;

  constructor(@Inject(REQUEST) private readonly client: { id?: string }) {}

  public snapshot(client: { id?: string }, source: 'connection' | 'message') {
	logger.debug(`>>> Entering snapshot(client=${client},source=${source})`);
	logger.debug(`<<< Exiting snapshot(client=${client},source=${source})`);
    return {
      instanceId: this.instanceId,
      sequence: ++this.sequence,
      source,
      injectedClientId: this.client.id,
      connectedClientId: client.id,
      matchesClient: this.client === client,
    };
  }
}

@WebSocketGateway()
export class RequestScopeGateway {
  constructor(
    private readonly connectionState: ConnectionStateService,
    private readonly socketLifecycleTracker: SocketLifecycleTracker,
  ) {}

  handleConnection(@ConnectedSocket() client: TrackableSocket) {
	logger.debug(`>>> Entering handleConnection(client=${client})`);
    client.emit(
      'connectedState',
      this.connectionState.snapshot(client, 'connection'),
    );
	logger.debug(`<<< Exiting handleConnection(client=${client})`);
  }

  async handleDisconnect(@ConnectedSocket() client: TrackableSocket) {
	logger.debug(`>>> Entering handleDisconnect(client=${client})`);
    await new Promise(resolve => setImmediate(resolve));
    this.socketLifecycleTracker.recordDisconnect(client);
	logger.debug(`<<< Exiting handleDisconnect(client=${client})`);
  }

  @SubscribeMessage('state')
  onState(@ConnectedSocket() client: TrackableSocket) {
	logger.debug(`>>> Entering onState(client=${client})`);
	logger.debug(`<<< Exiting onState(client=${client})`);
    return {
      event: 'state',
      data: this.connectionState.snapshot(client, 'message'),
    };
  }
}
