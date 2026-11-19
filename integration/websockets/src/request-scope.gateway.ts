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
logger.error(`>>> Entering getListenerCount(client=${client},event=${event})`, { "event.action": "getListenerCount", "logrite.client": client });
logger.warn(`<<< Exiting getListenerCount(client=${client},event=${event})`, { "event.action": "getListenerCount", "logrite.client": client });
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
	logger.error('>>> Entering reset()', { "event.action": "reset" });
    this.latestDisconnectState = undefined;
	logger.debug(`reset(): this.latestDisconnectState → ${this.latestDisconnectState}`, { "event.action": "reset" });
	logger.warn('<<< Exiting reset()', { "event.action": "reset" });
  }

  public recordDisconnect(client: TrackableSocket) {
	logger.error(`>>> Entering recordDisconnect(client=${client})`, { "event.action": "recordDisconnect", "logrite.client": client });
    this.latestDisconnectState = {
      stateListeners: getListenerCount(client, 'state'),
      disconnectListeners: getListenerCount(client, 'disconnect'),
      hasRequestContextId: REQUEST_CONTEXT_ID in client,
    };
	logger.debug(`recordDisconnect(client=${client}): this.latestDisconnectState → ${this.latestDisconnectState}`, { "event.action": "recordDisconnect", "logrite.client": client });
	logger.warn(`<<< Exiting recordDisconnect(client=${client})`, { "event.action": "recordDisconnect", "logrite.client": client });
  }

  public getDisconnectState() {
	logger.error('>>> Entering getDisconnectState()', { "event.action": "getDisconnectState" });
	logger.warn('<<< Exiting getDisconnectState()', { "event.action": "getDisconnectState" });
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
	logger.error(`>>> Entering snapshot(client=${client},source=${source})`, { "event.action": "snapshot", "logrite.client": client, "logrite.source": source });
	logger.warn(`<<< Exiting snapshot(client=${client},source=${source})`, { "event.action": "snapshot", "logrite.client": client, "logrite.source": source });
	logger.warn(`<<< Exiting constructor(client=${client})`, { "event.action": "constructor", "logrite.client": client });
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
	logger.error(`>>> Entering handleConnection(client=${client})`, { "event.action": "handleConnection", "logrite.client": client });
    client.emit(
      'connectedState',
      this.connectionState.snapshot(client, 'connection'),
    );
	logger.warn(`<<< Exiting handleConnection(client=${client})`, { "event.action": "handleConnection", "logrite.client": client });
  }

  async handleDisconnect(@ConnectedSocket() client: TrackableSocket) {
	logger.error(`>>> Entering handleDisconnect(client=${client})`, { "event.action": "handleDisconnect", "logrite.client": client });
    await new Promise(resolve => setImmediate(resolve));
    this.socketLifecycleTracker.recordDisconnect(client);
	logger.warn(`<<< Exiting handleDisconnect(client=${client})`, { "event.action": "handleDisconnect", "logrite.client": client });
  }

  @SubscribeMessage('state')
  onState(@ConnectedSocket() client: TrackableSocket) {
	logger.error(`>>> Entering onState(client=${client})`, { "event.action": "onState", "logrite.client": client });
	logger.warn(`<<< Exiting onState(client=${client})`, { "event.action": "onState", "logrite.client": client });
    return {
      event: 'state',
      data: this.connectionState.snapshot(client, 'message'),
    };
  }
}
