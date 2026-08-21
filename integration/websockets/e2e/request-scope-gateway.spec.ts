const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import {
  ConnectionStateService,
  RequestScopeGateway,
  SocketLifecycleTracker,
} from '../src/request-scope.gateway.js';

type ConnectionState = {
  instanceId: number;
  sequence: number;
  source: 'connection' | 'message';
  injectedClientId?: string;
  connectedClientId?: string;
  matchesClient: boolean;
};

async function createNestApp(...providers: any[]): Promise<INestApplication> {
logger.debug(`>>> Entering createNestApp(providers=${providers})`);
  const testingModule = await Test.createTestingModule({
    providers,
  }).compile();
logger.debug(`<<< Exiting createNestApp(providers=${providers})`);
  return testingModule.createNestApplication();
}

async function waitForSocketIoServer(url: string) {
logger.debug(`>>> Entering waitForSocketIoServer(url=${url})`);
  const endpoint = `${url}/socket.io/?EIO=4&transport=polling`;

const _start_waitForSocketIoServer = Date.now();
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(endpoint);
	logger.debug(`waitForSocketIoServer(url=${url}): response → ${response}`);
	logger.info(`waitForSocketIoServer(url=${url}): API call took ${Date.now() - _start_waitForSocketIoServer} ms`);
    if (response.status !== 404) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

logger.debug(`<<< Exiting waitForSocketIoServer(url=${url})`);
  throw new Error(`Socket.IO endpoint not available at ${endpoint}`);
}

function onceEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onSuccess = (payload: T) => {
	logger.debug(`>>> Entering onSuccess(payload=${payload})`);
      socket.off('connect_error', onError);
      resolve(payload);
	logger.debug(`<<< Exiting onSuccess(payload=${payload})`);
    };
    const onError = (error: Error) => {
	logger.debug(`>>> Entering onError(error=${error})`);
      socket.off(event, onSuccess);
      reject(error);
	logger.debug(`<<< Exiting onError(error=${error})`);
    };

    socket.once(event, onSuccess);
    socket.once('connect_error', onError);
  });
}

async function connectClient(url: string) {
logger.debug(`>>> Entering connectClient(url=${url})`);
  const socket = io(url, {
    autoConnect: false,
  });
  const connectedStatePromise = onceEvent<ConnectionState>(
    socket,
    'connectedState',
  );

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
    socket.connect();
  });

  const connectedState = await connectedStatePromise;
logger.debug(`<<< Exiting connectClient(url=${url})`);
  return { socket, connectedState };
}

async function emitState(socket: Socket): Promise<ConnectionState> {
  return new Promise<ConnectionState>((resolve, reject) => {
logger.debug(`>>> Entering emitState(socket=${socket})`);
    socket.emit('state');
	logger.debug(`<<< Exiting emitState(socket=${socket})`);
    socket.once('state', resolve);
    socket.once('connect_error', reject);
  });
}

async function waitForDisconnectState(tracker: SocketLifecycleTracker) {
logger.debug(`>>> Entering waitForDisconnectState(tracker=${tracker})`);
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = tracker.getDisconnectState();
    if (state) {
      return state;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }

logger.debug(`<<< Exiting waitForDisconnectState(tracker=${tracker})`);
  throw new Error('Disconnect state was not recorded');
}

describe('WebSocketGateway request scope', () => {
  let app: INestApplication;
  let socketLifecycleTracker: SocketLifecycleTracker;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    app = await createNestApp(
      RequestScopeGateway,
      ConnectionStateService,
      SocketLifecycleTracker,
    );
    await app.listen(3000);
    await waitForSocketIoServer('http://localhost:3000');
    socketLifecycleTracker = app.get(SocketLifecycleTracker);
    socketLifecycleTracker.reset();
  });

  it('should reuse the same request-scoped provider per connection and isolate across clients', async () => {
    const firstClient = await connectClient('http://localhost:3000');
    sockets.push(firstClient.socket);

    expect(firstClient.connectedState.source).toBe('connection');
    expect(firstClient.connectedState.sequence).toBe(1);
    expect(firstClient.connectedState.matchesClient).toBe(true);
    expect(firstClient.connectedState.injectedClientId).toBe(
      firstClient.connectedState.connectedClientId,
    );

    const firstClientMessage = await emitState(firstClient.socket);

    expect(firstClientMessage.source).toBe('message');
    expect(firstClientMessage.sequence).toBe(2);
    expect(firstClientMessage.instanceId).toBe(
      firstClient.connectedState.instanceId,
    );
    expect(firstClientMessage.matchesClient).toBe(true);
    expect(firstClientMessage.injectedClientId).toBe(
      firstClient.connectedState.injectedClientId,
    );

    const secondClient = await connectClient('http://localhost:3000');
    sockets.push(secondClient.socket);

    expect(secondClient.connectedState.source).toBe('connection');
    expect(secondClient.connectedState.sequence).toBe(1);
    expect(secondClient.connectedState.instanceId).not.toBe(
      firstClient.connectedState.instanceId,
    );
    expect(secondClient.connectedState.matchesClient).toBe(true);

    const secondClientMessage = await emitState(secondClient.socket);

    expect(secondClientMessage.sequence).toBe(2);
    expect(secondClientMessage.instanceId).toBe(
      secondClient.connectedState.instanceId,
    );
    expect(secondClientMessage.instanceId).not.toBe(
      firstClient.connectedState.instanceId,
    );
    expect(secondClientMessage.injectedClientId).toBe(
      secondClient.connectedState.injectedClientId,
    );

    await new Promise<void>(resolve => {
      firstClient.socket.once('disconnect', () => resolve());
      firstClient.socket.disconnect();
    });

    const disconnectState = await waitForDisconnectState(
      socketLifecycleTracker,
    );
    expect(disconnectState.stateListeners).toBe(0);
    expect(disconnectState.disconnectListeners).toBe(0);
    expect(disconnectState.hasRequestContextId).toBe(false);
  });

  afterEach(async () => {
    await Promise.all(
      sockets.splice(0).map(
        socket =>
          new Promise<void>(resolve => {
            if (!socket.connected) {
              resolve();
              return;
            }
            socket.once('disconnect', () => resolve());
            socket.disconnect();
          }),
      ),
    );
    await app.close();
  });
});
