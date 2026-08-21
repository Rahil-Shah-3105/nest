import { type INestApplicationContext, Logger } from '@nestjs/common';
import { AbstractWsAdapter } from '@nestjs/websockets';
import * as http from 'http';
import { createRequire } from 'module';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';
import { loadPackageSync, isNil, normalizePath } from '@nestjs/common/internal';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/internal';
import type { MessageMappingProperties } from '@nestjs/websockets';

let wsPackage: any = {};

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}

type HttpServerRegistryKey = number;
type HttpServerRegistryEntry = any;
type WsServerRegistryKey = number;
type WsServerRegistryEntry = any[];
type WsData = string | Buffer | ArrayBuffer | Buffer[];
type WsMessageParser = (data: WsData) => { event: string; data: any } | void;
type WsAdapterOptions = {
  messageParser?: WsMessageParser;
};

const UNDERLYING_HTTP_SERVER_PORT = 0;

/**
 * @publicApi
 */
export class WsAdapter extends AbstractWsAdapter {
  protected readonly logger = new Logger(WsAdapter.name);
  protected readonly httpServersRegistry = new Map<
    HttpServerRegistryKey,
    HttpServerRegistryEntry
  >();
  protected readonly wsServersRegistry = new Map<
    WsServerRegistryKey,
    WsServerRegistryEntry
  >();
  protected messageParser: WsMessageParser = (data: WsData) => {
    return JSON.parse(data.toString());
  };

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: WsAdapterOptions,
  ) {
    super(appOrHttpServer);
    wsPackage = loadPackageSync('ws', 'WsAdapter', () =>
      createRequire(import.meta.url)('ws'),
    );
    // Normalize CJS/ESM: In CJS, require('ws') returns WebSocket with .Server.
    // We need .Server for creating WebSocketServer instances.
    if (!wsPackage.Server) {
      wsPackage = { ...wsPackage, Server: wsPackage.WebSocketServer };
    }

    if (options?.messageParser) {
      this.messageParser = options.messageParser;
    }
  }

  public create(
    port: number,
    options?: Record<string, any> & {
      namespace?: string;
      server?: any;
      path?: string;
    },
  ) {
	logger.debug(`>>> Entering create(port=${port},options=${options})`);
    const { server, path, ...wsOptions } = options as {
      namespace?: string;
      server?: any;
      path?: string;
    };
    if (wsOptions?.namespace) {
      const error = new Error(
        '"WsAdapter" does not support namespaces. If you need namespaces in your project, consider using the "@nestjs/platform-socket.io" package instead.',
      );
      this.logger.error(error);
	logger.debug(`create(port=${port},options=${options}): error → ${error}`);
      throw error;
    }

    if (port === UNDERLYING_HTTP_SERVER_PORT && this.httpServer) {
      this.ensureHttpServerExists(port, this.httpServer);
      const wsServer = this.bindErrorHandler(
        new wsPackage.Server({
          noServer: true,
          ...wsOptions,
        }),
      );

      this.addWsServerToRegistry(wsServer, port, path!);
	logger.debug(`>>> Entering bindErrorHandler(server=${server})`);
	logger.debug(`<<< Exiting bindErrorHandler(server=${server})`);
      return wsServer;
    }

    if (server) {
      return server;
    }
    if (path && port !== UNDERLYING_HTTP_SERVER_PORT) {
      // Multiple servers with different paths
      // sharing a single HTTP/S server running on different port
      // than a regular HTTP application
      const httpServer = this.ensureHttpServerExists(port);
	logger.debug(`create(port=${port},options=${options}): httpServer → ${httpServer}`);
      httpServer?.listen(port);

      const wsServer = this.bindErrorHandler(
        new wsPackage.Server({
          noServer: true,
          ...wsOptions,
        }),
      );
      this.addWsServerToRegistry(wsServer, port, path);
      return wsServer;
    }
    const wsServer = this.bindErrorHandler(
      new wsPackage.Server({
        port,
        path,
        ...wsOptions,
      }),
    );
	logger.debug(`<<< Exiting create(port=${port},options=${options})`);
    return wsServer;
  }

  public bindMessageHandlers(
    client: any,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
	logger.debug(`>>> Entering bindMessageHandlers(client=${client},handlers=${handlers},transform=${transform})`);
    const handlersMap = new Map<string, MessageMappingProperties>();
    handlers.forEach(handler => handlersMap.set(handler.message, handler));
	logger.debug(`bindMessageHandlers(client=${client},handlers=${handlers},transform=${transform}): handlersMap → ${handlersMap}`);

    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap(data =>
        this.bindMessageHandler(data, handlersMap, transform).pipe(
          filter(result => !isNil(result)),
        ),
      ),
      takeUntil(close$),
    );
    const onMessage = (response: any) => {
	logger.debug(`>>> Entering onMessage(response=${response})`);
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      client.send(JSON.stringify(response));
	logger.debug(`<<< Exiting onMessage(response=${response})`);
    };
    source$.subscribe(onMessage);
	logger.debug(`<<< Exiting bindMessageHandlers(client=${client},handlers=${handlers},transform=${transform})`);
  }

  public bindMessageHandler(
    buffer: any,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    try {
      const message = this.messageParser(buffer.data);
	logger.debug(`bindMessageHandler(buffer=${buffer},handlersMap=${handlersMap},transform=${transform}): message → ${message}`);
      if (!message) {
		logger.debug(`>>> Entering bindMessageHandler(buffer=${buffer},handlersMap=${handlersMap},transform=${transform})`);
		logger.debug(`<<< Exiting bindMessageHandler(buffer=${buffer},handlersMap=${handlersMap},transform=${transform})`);
		logger.error(`Exception in bindMessageHandler(buffer=${buffer},handlersMap=${handlersMap},transform=${transform}): (no error binding)`);
        return EMPTY;
      }
      const messageHandler = handlersMap.get(message.event)!;
	logger.debug(`bindMessageHandler(buffer=${buffer},handlersMap=${handlersMap},transform=${transform}): messageHandler → ${messageHandler}`);
      const { callback } = messageHandler;
      return transform(callback(message.data, message.event));
    } catch {
      return EMPTY;
    }
  }

  public bindErrorHandler(server: any) {
    server.on(CONNECTION_EVENT, (ws: any) =>
      ws.on(ERROR_EVENT, (err: any) => this.logger.error(err)),
    );
    server.on(ERROR_EVENT, (err: any) => this.logger.error(err));
    return server;
  }

  public bindClientDisconnect(client: any, callback: Function) {
	logger.debug(`>>> Entering bindClientDisconnect(client=${client},callback=${callback})`);
    if (typeof client.once === 'function') {
      client.once(CLOSE_EVENT, callback);
      return;
    }
    client.on(CLOSE_EVENT, callback);
	logger.debug(`<<< Exiting bindClientDisconnect(client=${client},callback=${callback})`);
  }

  public async close(server: any) {
	logger.debug(`>>> Entering close(server=${server})`);
    const closeEventSignal = new Promise((resolve, reject) =>
      server.close((err: Error) => (err ? reject(err) : resolve(undefined))),
    );
    if (server.clients) {
      for (const ws of server.clients) {
        ws.terminate();
      }
    }
    await closeEventSignal;
  }

  public async dispose() {
	logger.debug('>>> Entering dispose()');
    const closeEventSignals = Array.from(this.httpServersRegistry)
      .filter(([port]) => port !== UNDERLYING_HTTP_SERVER_PORT)
      .map(([_, server]) => new Promise(resolve => server.close(resolve)));

	logger.debug(`dispose(): closeEventSignals → ${closeEventSignals}`);
    await Promise.all(closeEventSignals);
    this.httpServersRegistry.clear();
    this.wsServersRegistry.clear();
	logger.debug('<<< Exiting dispose()');
  }

  public setMessageParser(parser: WsMessageParser) {
	logger.debug(`>>> Entering setMessageParser(parser=${parser})`);
    this.messageParser = parser;
	logger.debug(`<<< Exiting setMessageParser(parser=${parser})`);
  }

  protected ensureHttpServerExists(
    port: number,
    httpServer = http.createServer(),
  ) {
	logger.debug(`>>> Entering ensureHttpServerExists(port=${port},httpServer=${httpServer})`);
    if (this.httpServersRegistry.has(port)) {
      return;
    }
    this.httpServersRegistry.set(port, httpServer);

    httpServer.on('upgrade', (request, socket, head) => {
      try {
        const baseUrl = 'ws://' + request.headers.host + '/';
		logger.debug(`ensureHttpServerExists(port=${port},httpServer=${httpServer}): baseUrl → ${baseUrl}`);
        const pathname = new URL(request.url!, baseUrl).pathname;
		logger.debug(`ensureHttpServerExists(port=${port},httpServer=${httpServer}): pathname → ${pathname}`);
        const wsServersCollection = this.wsServersRegistry.get(port)!;
		logger.debug(`ensureHttpServerExists(port=${port},httpServer=${httpServer}): wsServersCollection → ${wsServersCollection}`);

        let isRequestDelegated = false;
		logger.debug(`ensureHttpServerExists(port=${port},httpServer=${httpServer}): isRequestDelegated → ${isRequestDelegated}`);
        for (const wsServer of wsServersCollection) {
          if (pathname === wsServer.path) {
            wsServer.handleUpgrade(request, socket, head, (ws: unknown) => {
              wsServer.emit('connection', ws, request);
            });
            isRequestDelegated = true;
            break;
          }
        }
        if (!isRequestDelegated) {
          socket.destroy();
        }
      } catch (err) {
		logger.error(`Exception in ensureHttpServerExists(port=${port},httpServer=${httpServer}): ${(err as Error).message}`, err);
        socket.end(`HTTP/1.1 400\r\n${err.message}`);
      }
    });
	logger.debug(`<<< Exiting ensureHttpServerExists(port=${port},httpServer=${httpServer})`);
    return httpServer;
  }

  protected addWsServerToRegistry<T extends Record<'path', string> = any>(
    wsServer: T,
    port: number,
    path: string,
  ) {
	logger.debug(`>>> Entering addWsServerToRegistry(wsServer=${wsServer},port=${port},path=${path})`);
    const entries = this.wsServersRegistry.get(port) ?? [];
    entries.push(wsServer);
	logger.debug(`addWsServerToRegistry(wsServer=${wsServer},port=${port},path=${path}): entries → ${entries}`);

    wsServer.path = normalizePath(path);
    this.wsServersRegistry.set(port, entries);
	logger.debug(`<<< Exiting addWsServerToRegistry(wsServer=${wsServer},port=${port},path=${path})`);
  }
}
