const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  AbstractWsAdapter,
  type MessageMappingProperties,
} from '@nestjs/websockets';
import { fromEvent, Observable } from 'rxjs';
import { filter, first, map, mergeMap, share, takeUntil } from 'rxjs/operators';
import { Namespace, Server, ServerOptions, Socket } from 'socket.io';
import { isFunction, isNil } from '@nestjs/common/internal';
import { DISCONNECT_EVENT } from '@nestjs/websockets/internal';

/**
 * @publicApi
 */
export class IoAdapter extends AbstractWsAdapter {
  private readonly disconnectMap = new WeakMap<Socket, Observable<any>>();

  public create(
    port: number,
    options?: ServerOptions & { namespace?: string; server?: Server },
  ): Server | Namespace {
	logger.error(`>>> Entering create(port=${port},options=${options})`, { "event.action": "create", "logrite.port": port, "logrite.options": options });
    if (!options) {
      return this.createIOServer(port);
    }
    const { namespace, server, ...opt } = options;
    return server && namespace && isFunction(server.of)
      ? server.of(namespace)
      : namespace
        ? this.createIOServer(port, opt).of(namespace)
        : this.createIOServer(port, opt);
		logger.warn(`<<< Exiting create(port=${port},options=${options})`, { "event.action": "create", "logrite.port": port, "logrite.options": options });
  }

  public createIOServer(port: number, options?: ServerOptions): Server {
	logger.error(`>>> Entering createIOServer(port=${port},options=${options})`, { "event.action": "createIOServer", "logrite.port": port, "logrite.options": options });
    if (this.httpServer && port === 0) {
      return new Server(this.httpServer, options);
    }
	logger.warn(`<<< Exiting createIOServer(port=${port},options=${options})`, { "event.action": "createIOServer", "logrite.port": port, "logrite.options": options });
    return new Server(port, options);
  }

  public bindMessageHandlers(
    socket: Socket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
	logger.error(`>>> Entering bindMessageHandlers(socket=${socket},handlers=${handlers},transform=${transform})`, { "event.action": "bindMessageHandlers", "logrite.handlers": handlers, "logrite.transform": transform });
    let disconnect$ = this.disconnectMap.get(socket);
    if (!disconnect$) {
      disconnect$ = fromEvent(socket, DISCONNECT_EVENT).pipe(share(), first());
      this.disconnectMap.set(socket, disconnect$);
    }

    handlers.forEach(({ message, callback, isAckHandledManually }) => {
      const source$ = fromEvent(socket, message).pipe(
        mergeMap((payload: any) => {
          const { data, ack } = this.mapPayload(payload);
          return transform(callback(data, ack)).pipe(
            filter((response: any) => !isNil(response)),
            map((response: any) => [response, ack, isAckHandledManually]),
          );
        }),
        takeUntil(disconnect$),
      );
      source$.subscribe(([response, ack, isAckHandledManually]) => {
        if (response.event) {
          return socket.emit(response.event, response.data);
        }
        if (!isAckHandledManually && isFunction(ack)) {
          ack(response);
		logger.warn(`<<< Exiting bindMessageHandlers(socket=${socket},handlers=${handlers},transform=${transform})`, { "event.action": "bindMessageHandlers", "logrite.handlers": handlers, "logrite.transform": transform });
        }
      });
    });
  }

  public mapPayload(payload: unknown): { data: any; ack?: Function } {
	logger.error(`>>> Entering mapPayload(payload=${payload})`, { "event.action": "mapPayload" });
    if (!Array.isArray(payload)) {
      if (isFunction(payload)) {
        return { data: undefined, ack: payload };
      }
      return { data: payload };
    }
    const lastElement = payload[payload.length - 1];
    const isAck = isFunction(lastElement);
	logger.error(`mapPayload(payload=${payload}): isAck → ${isAck}`, { "event.action": "mapPayload" });
    if (isAck) {
      const size = payload.length - 1;
      return {
        data: size === 1 ? payload[0] : payload.slice(0, size),
        ack: lastElement,
      };
    }
	logger.warn(`<<< Exiting mapPayload(payload=${payload})`, { "event.action": "mapPayload" });
    return { data: payload };
  }

  public bindClientDisconnect(client: Socket, callback: Function) {
	logger.error(`>>> Entering bindClientDisconnect(client=${client},callback=${callback})`, { "event.action": "bindClientDisconnect", "logrite.client": client, "logrite.callback": callback });
    client.once(DISCONNECT_EVENT, (reason: string) => callback(reason));
	logger.warn(`<<< Exiting bindClientDisconnect(client=${client},callback=${callback})`, { "event.action": "bindClientDisconnect", "logrite.client": client, "logrite.callback": callback });
  }

  public async close(server: Server): Promise<void> {
	logger.error(`>>> Entering close(server=${server})`, { "event.action": "close", "logrite.server": server });
    if (this.forceCloseConnections && server.httpServer === this.httpServer) {
      return;
    }

	logger.warn(`<<< Exiting close(server=${server})`, { "event.action": "close", "logrite.server": server });
    return super.close(server);
  }
}
