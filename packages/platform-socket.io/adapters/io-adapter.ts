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
    if (!options) {
	logger.debug(`>>> Entering create(port=${port},options=${options})`);
      return this.createIOServer(port);
    }
    const { namespace, server, ...opt } = options;
    return server && namespace && isFunction(server.of)
      ? server.of(namespace)
      : namespace
        ? this.createIOServer(port, opt).of(namespace)
        : this.createIOServer(port, opt);
		logger.debug(`<<< Exiting create(port=${port},options=${options})`);
  }

  public createIOServer(port: number, options?: ServerOptions): Server {
    if (this.httpServer && port === 0) {
	logger.debug(`>>> Entering createIOServer(port=${port},options=${options})`);
	logger.debug(`<<< Exiting createIOServer(port=${port},options=${options})`);
      return new Server(this.httpServer, options);
    }
    return new Server(port, options);
  }

  public bindMessageHandlers(
    socket: Socket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
	logger.debug(`>>> Entering bindMessageHandlers(socket=${socket},handlers=${handlers},transform=${transform})`);
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
		logger.debug(`<<< Exiting bindMessageHandlers(socket=${socket},handlers=${handlers},transform=${transform})`);
        }
      });
    });
  }

  public mapPayload(payload: unknown): { data: any; ack?: Function } {
    if (!Array.isArray(payload)) {
	logger.debug(`>>> Entering mapPayload(payload=${payload})`);
      if (isFunction(payload)) {
        return { data: undefined, ack: payload };
      }
      return { data: payload };
    }
    const lastElement = payload[payload.length - 1];
    const isAck = isFunction(lastElement);
	logger.debug(`mapPayload(payload=${payload}): isAck → ${isAck}`);
    if (isAck) {
      const size = payload.length - 1;
      return {
        data: size === 1 ? payload[0] : payload.slice(0, size),
        ack: lastElement,
      };
    }
	logger.debug(`<<< Exiting mapPayload(payload=${payload})`);
    return { data: payload };
  }

  public bindClientDisconnect(client: Socket, callback: Function) {
	logger.debug(`>>> Entering bindClientDisconnect(client=${client},callback=${callback})`);
    client.once(DISCONNECT_EVENT, (reason: string) => callback(reason));
	logger.debug(`<<< Exiting bindClientDisconnect(client=${client},callback=${callback})`);
  }

  public async close(server: Server): Promise<void> {
    if (this.forceCloseConnections && server.httpServer === this.httpServer) {
	logger.debug(`>>> Entering close(server=${server})`);
	logger.debug(`<<< Exiting close(server=${server})`);
      return;
    }

    return super.close(server);
  }
}
