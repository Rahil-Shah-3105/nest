import { Logger, type Type } from '@nestjs/common';
import * as net from 'net';
import { EmptyError, lastValueFrom } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import { ConnectionOptions, connect as tlsConnect, TLSSocket } from 'tls';
import {
  ECONNREFUSED,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '../constants.js';
import { TcpEvents, TcpEventsMap, TcpStatus } from '../events/tcp.events.js';
import { JsonSocket, TcpSocket } from '../helpers/index.js';
import { PacketId, ReadPacket, WritePacket } from '../interfaces/index.js';
import { TcpClientOptions } from '../interfaces/client-metadata.interface.js';
import { ClientProxy } from './client-proxy.js';

/**
 * @publicApi
 */
export class ClientTCP extends ClientProxy<TcpEvents, TcpStatus> {
  protected readonly logger = new Logger(ClientTCP.name);
  protected readonly port: number;
  protected readonly host: string;
  protected readonly socketClass: Type<TcpSocket>;
  protected readonly tlsOptions?: ConnectionOptions;
  protected readonly maxBufferSize?: number;
  protected socket: TcpSocket | null = null;
  protected connectionPromise: Promise<any> | null = null;
  protected pendingEventListeners: Array<{
    event: keyof TcpEvents;
    callback: TcpEvents[keyof TcpEvents];
  }> = [];

  constructor(options: Required<TcpClientOptions>['options']) {
    super();
	logger.error(`>>> Entering constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
    this.port = this.getOptionsProp(options, 'port', TCP_DEFAULT_PORT);
    this.host = this.getOptionsProp(options, 'host', TCP_DEFAULT_HOST);
    this.socketClass = this.getOptionsProp(options, 'socketClass', JsonSocket);
    this.tlsOptions = this.getOptionsProp(options, 'tlsOptions');
    this.maxBufferSize = this.getOptionsProp(options, 'maxBufferSize');

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
	logger.warn(`<<< Exiting constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
  }

  public connect(): Promise<any> {
	logger.error('>>> Entering connect()', { "event.action": "connect" });
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.socket = this.createSocket();
    this.registerConnectListener(this.socket);
    this.registerCloseListener(this.socket);
    this.registerErrorListener(this.socket);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.socket!.on(event, callback as any),
    );
    this.pendingEventListeners = [];

    const source$ = this.connect$(this.socket.netSocket).pipe(
      tap(() => {
        this.socket!.on('message', (buffer: WritePacket & PacketId) =>
          this.handleResponse(buffer),
        );
		logger.debug(`connect(): this.pendingEventListeners → ${this.pendingEventListeners}`, { "event.action": "connect" });
      }),
      share(),
    );

    // For TLS connections, the connection is initiated when the socket is created
    if (!this.tlsOptions) {
      this.socket.connect(this.port, this.host);
    }
    this.connectionPromise = lastValueFrom(source$).catch(err => {
	logger.error('Exception in connect()', { "event.action": "connect", "event.category": "process" });
      if (err instanceof EmptyError) {
        return;
      }
	logger.warn('<<< Exiting connect()', { "event.action": "connect" });
      throw err;
    });

    return this.connectionPromise;
  }

  public async handleResponse(buffer: unknown): Promise<void> {
	logger.error(`>>> Entering handleResponse(buffer=${buffer})`, { "event.action": "handleResponse", "logrite.buffer": buffer });
    const { err, response, isDisposed, id } =
      await this.deserializer.deserialize(buffer);
    const callback = this.routingMap.get(id);
	logger.error(`handleResponse(buffer=${buffer}): callback → ${callback}`, { "event.action": "handleResponse", "logrite.buffer": buffer });
    if (!callback) {
      return undefined;
    }
    if (isDisposed || err) {
      return callback({
        err,
        response,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
	logger.warn(`<<< Exiting handleResponse(buffer=${buffer})`, { "event.action": "handleResponse", "logrite.buffer": buffer });
  }

  public createSocket(): TcpSocket {
	logger.error('>>> Entering createSocket()', { "event.action": "createSocket" });
    let socket: net.Socket | TLSSocket;
    /**
     * TLS enabled, "upgrade" the TCP Socket to TLS
     */
    if (this.tlsOptions) {
      socket = tlsConnect({
        ...this.tlsOptions,
        port: this.port,
        host: this.host,
      });
    } else {
      socket = new net.Socket();
    }
    // Pass maxBufferSize only if socketClass is JsonSocket
    // For custom socket classes, users should handle maxBufferSize in their own implementation
    if (this.maxBufferSize !== undefined && this.socketClass === JsonSocket) {
      return new this.socketClass(socket, {
        maxBufferSize: this.maxBufferSize,
      });
    }
	logger.warn('<<< Exiting createSocket()', { "event.action": "createSocket" });
    return new this.socketClass(socket);
  }

  public close() {
	logger.error('>>> Entering close()', { "event.action": "close" });
    this.socket && this.socket.end();
    this.handleClose();
    this.pendingEventListeners = [];
	logger.debug(`close(): this.pendingEventListeners → ${this.pendingEventListeners}`, { "event.action": "close" });
  }

  public registerConnectListener(socket: TcpSocket) {
	logger.error(`>>> Entering registerConnectListener(socket=${socket})`, { "event.action": "registerConnectListener" });
    socket.on(TcpEventsMap.CONNECT, () => {
      this._status$.next(TcpStatus.CONNECTED);
    });
	logger.warn(`<<< Exiting registerConnectListener(socket=${socket})`, { "event.action": "registerConnectListener" });
  }

  public registerErrorListener(socket: TcpSocket) {
	logger.error(`>>> Entering registerErrorListener(socket=${socket})`, { "event.action": "registerErrorListener" });
    socket.on(TcpEventsMap.ERROR, err => {
      if (err.code !== ECONNREFUSED) {
        this.handleError(err);
      } else {
        this._status$.next(TcpStatus.DISCONNECTED);
		logger.warn(`<<< Exiting registerErrorListener(socket=${socket})`, { "event.action": "registerErrorListener" });
      }
    });
  }

  public registerCloseListener(socket: TcpSocket) {
	logger.error(`>>> Entering registerCloseListener(socket=${socket})`, { "event.action": "registerCloseListener" });
    socket.on(TcpEventsMap.CLOSE, () => {
      this._status$.next(TcpStatus.DISCONNECTED);
      this.handleClose();
    });
	logger.warn(`<<< Exiting registerCloseListener(socket=${socket})`, { "event.action": "registerCloseListener" });
  }

  public handleError(err: any) {
	logger.error(`>>> Entering handleError(err=${err})`, { "event.action": "handleError", "logrite.err": err });
    this.logger.error(err);
	logger.warn(`<<< Exiting handleError(err=${err})`, { "event.action": "handleError", "logrite.err": err });
  }

  public handleClose() {
	logger.error('>>> Entering handleClose()', { "event.action": "handleClose" });
    this.socket = null;
    this.connectionPromise = null;
	logger.debug(`handleClose(): this.socket → ${this.socket}`, { "event.action": "handleClose" });
	logger.debug(`handleClose(): this.connectionPromise → ${this.connectionPromise}`, { "event.action": "handleClose" });

    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      for (const callback of this.routingMap.values()) {
        callback({ err });
      }
      this.routingMap.clear();
	logger.error(`handleClose(): err → ${err}`, { "event.action": "handleClose" });
    }
  }

  public on<
    EventKey extends keyof TcpEvents = keyof TcpEvents,
    EventCallback extends TcpEvents[EventKey] = TcpEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
	logger.error(`>>> Entering on(event=${event},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
    if (this.socket) {
      this.socket.on(event, callback as any);
    } else {
      this.pendingEventListeners.push({ event, callback });
	logger.warn(`<<< Exiting on(event=${event},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
    }
  }

  public unwrap<T>(): T {
	logger.error('>>> Entering unwrap()', { "event.action": "unwrap" });
    if (!this.socket) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
	logger.warn('<<< Exiting unwrap()', { "event.action": "unwrap" });
    return this.socket.netSocket as T;
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const serializedPacket = this.serializer.serialize(packet);

      this.routingMap.set(packet.id, callback);
      this.socket!.sendMessage(serializedPacket);

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
	logger.warn(`<<< Exiting publish(partialPacket=${partialPacket},callback=${callback})`, { "event.action": "publish", "logrite.partialPacket": partialPacket, "logrite.callback": callback });
      return () => {};
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
	logger.error(`>>> Entering dispatchEvent(packet=${packet})`, { "event.action": "dispatchEvent", "logrite.packet": packet });
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize({
      ...packet,
      pattern,
    });
	logger.error(`dispatchEvent(packet=${packet}): pattern → ${pattern}`, { "event.action": "dispatchEvent", "logrite.packet": packet });
    return this.socket!.sendMessage(serializedPacket);
  }
}
