import { Logger } from '@nestjs/common';
import { isObject, loadPackageSync } from '@nestjs/common/internal';
import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { NATS_DEFAULT_URL } from '../constants.js';
import { NatsResponseJSONDeserializer } from '../deserializers/nats-response-json.deserializer.js';
import { EmptyResponseException } from '../errors/empty-response.exception.js';
import {
  NatsEvents,
  NatsEventsMap,
  NatsStatus,
} from '../events/nats.events.js';
import {
  NatsOptions,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces/index.js';
import { NatsRecord } from '../record-builders/index.js';
import { NatsRecordSerializer } from '../serializers/nats-record.serializer.js';
import { ClientProxy } from './client-proxy.js';

let natsPackage = {} as any;

// To enable type safety for Nats. This cant be uncommented by default
// because it would require the user to install the nats package even if they dont use Nats
// Otherwise, TypeScript would fail to compile the code.
//
// type Client = import('@nats-io/transport-node').NatsConnection;
// type NatsMsg = import('@nats-io/transport-node').Msg;

type Client = Record<string, any>;
type NatsMsg = Record<string, any>;

/**
 * @publicApi
 */
export class ClientNats extends ClientProxy<NatsEvents, NatsStatus> {
  protected readonly logger = new Logger(ClientNats.name);

  protected natsClient: Client | null = null;
  protected connectionPromise: Promise<Client> | null = null;
  protected statusEventEmitter = new EventEmitter<{
    [key in keyof NatsEvents]: Parameters<NatsEvents[key]>;
  }>();

  constructor(protected readonly options: Required<NatsOptions>['options']) {
    super();
	logger.debug('>>> Entering constructor()');
    natsPackage = loadPackageSync(
      '@nats-io/transport-node',
      ClientNats.name,
      () => createRequire(import.meta.url)('@nats-io/transport-node'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
	logger.debug('<<< Exiting constructor()');
  }

  public async close() {
	logger.debug('>>> Entering close()');
    await this.natsClient?.close();
    this.statusEventEmitter.removeAllListeners();

    this.natsClient = null;
    this.connectionPromise = null;
	logger.debug(`close(): this.connectionPromise → ${this.connectionPromise}`);
  }

  public async connect(): Promise<any> {
    if (this.connectionPromise) {
	logger.debug('>>> Entering connect()');
      return this.connectionPromise;
    }
    this.connectionPromise = this.createClient();
    this.natsClient = await this.connectionPromise.catch(err => {
      this.connectionPromise = null;
      throw err;
    });
	logger.error('Exception in connect()');
	logger.debug(`connect(): this.connectionPromise → ${this.connectionPromise}`);

    this._status$.next(NatsStatus.CONNECTED);
    void this.handleStatusUpdates(this.natsClient);
	logger.debug('<<< Exiting connect()');
    return this.natsClient;
  }

  public async createClient(): Promise<Client> {
    // Eagerly initialize serializer/deserializer so they can be used synchronously
    if (
      this.serializer &&
      typeof (this.serializer as any).init === 'function'
    ) {
	logger.debug('>>> Entering createClient()');
      await (this.serializer as any).init();
    }
    if (
      this.deserializer &&
      typeof (this.deserializer as any).init === 'function'
    ) {
      await (this.deserializer as any).init();
    }

    const options = this.options || ({} as NatsOptions);
	logger.debug('<<< Exiting createClient()');
    return natsPackage.connect({
      servers: NATS_DEFAULT_URL,
      ...options,
    });
  }

  public async handleStatusUpdates(client: Client) {
	logger.debug(`>>> Entering handleStatusUpdates(client=${client})`);
    for await (const status of client.status()) {
      switch (status.type) {
        case 'error':
          this.logger.error(
            `NatsError: type: "${status.type}", error: "${status.error}".`,
          );
          break;

        case 'disconnect':
          this.connectionPromise = Promise.reject(
            'Error: Connection lost. Trying to reconnect...',
          );
          // Prevent unhandled promise rejection
          this.connectionPromise.catch(() => {});

          this.logger.error(`NatsError: type: "${status.type}".`);

          this._status$.next(NatsStatus.DISCONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.DISCONNECT,
            status.server as string,
          );
          break;

        case 'reconnecting':
          this._status$.next(NatsStatus.RECONNECTING);
          break;

        case 'reconnect':
          this.connectionPromise = Promise.resolve(client);
          this.logger.log(`NatsStatus: type: "${status.type}".`);

          this._status$.next(NatsStatus.CONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.RECONNECT,
            status.server as string,
          );
          break;

        case 'ping':
          if (this.options.debug) {
            this.logger.debug(
              `NatsStatus: type: "${status.type}", pending pings: "${status.pendingPings}".`,
            );
          }
          break;

        case 'update':
          this.logger.log(
            `NatsStatus: type: "${status.type}", added: "${status.added}", deleted: "${status.deleted}".`,
          );
          this.statusEventEmitter.emit(NatsEventsMap.UPDATE, {
            added: status.added,
            deleted: status.deleted,
          });
          break;

        default: {
		logger.debug(`<<< Exiting handleStatusUpdates(client=${client})`);
          const data =
            'data' in status && isObject(status.data)
              ? JSON.stringify(status.data)
              : 'data' in status
                ? status.data
                : '';
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          break;
        }
      }
    }
  }

  public on<
    EventKey extends keyof NatsEvents = keyof NatsEvents,
    EventCallback extends NatsEvents[EventKey] = NatsEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
	logger.debug(`>>> Entering on(event=${event},callback=${callback})`);
    this.statusEventEmitter.on(event as string | symbol, callback as any);
	logger.debug(`<<< Exiting on(event=${event},callback=${callback})`);
  }

  public unwrap<T>(): T {
    if (!this.natsClient) {
	logger.debug('>>> Entering unwrap()');
	logger.debug('<<< Exiting unwrap()');
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.natsClient as T;
  }

  public createSubscriptionHandler(
    packet: ReadPacket & PacketId,
    callback: (packet: WritePacket) => any,
  ) {
    return async (error: Error | null, natsMsg: NatsMsg) => {
      if (error) {
        return callback({
          err: error,
        });
      }
      const rawPacket = natsMsg.data;
      if (rawPacket?.length === 0) {
        return callback({
          err: new EmptyResponseException(
            this.normalizePattern(packet.pattern),
          ),
          isDisposed: true,
        });
      }
      const message = await this.deserializer.deserialize(natsMsg);
      if (message.id && message.id !== packet.id) {
        return undefined;
      }
      const { err, response, isDisposed } = message;
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
    };
	logger.debug(`<<< Exiting createSubscriptionHandler(packet=${packet},callback=${callback})`);
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
	logger.debug(`publish(partialPacket=${partialPacket},callback=${callback}): packet → ${packet}`);
      const channel = this.normalizePattern(partialPacket.pattern);
      const serializedPacket: NatsRecord = this.serializer.serialize(
        packet,
      ) as NatsRecord;
	logger.debug(`publish(partialPacket=${partialPacket},callback=${callback}): channel → ${channel}`);
      const inbox = natsPackage.createInbox(this.options.inboxPrefix);

      const subscriptionHandler = this.createSubscriptionHandler(
        packet,
        callback,
      );

      const subscription = this.natsClient!.subscribe(inbox, {
        callback: subscriptionHandler as (
          err: Error | null,
          msg: NatsMsg,
        ) => Promise<never>,
      });

	logger.debug(`publish(partialPacket=${partialPacket},callback=${callback}): inbox → ${inbox}`);
      const headers = this.mergeHeaders(serializedPacket.headers);
      this.natsClient!.publish(channel, serializedPacket.data, {
        reply: inbox,
        headers,
      });

	logger.debug(`>>> Entering publish(partialPacket=${partialPacket},callback=${callback})`);
	logger.debug(`<<< Exiting publish(partialPacket=${partialPacket},callback=${callback})`);
      return () => subscription.unsubscribe();
    } catch (err) {
      callback({ err });
      return () => {};
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
	logger.debug(`dispatchEvent(packet=${packet}): pattern → ${pattern}`);
    const serializedPacket: NatsRecord =
      await this.serializer.serialize(packet);
    const headers = this.mergeHeaders(serializedPacket.headers);
	logger.debug(`dispatchEvent(packet=${packet}): headers → ${headers}`);

    return new Promise<void>((resolve, reject) => {
	logger.debug(`>>> Entering dispatchEvent(packet=${packet})`);
      try {
		logger.debug(`<<< Exiting dispatchEvent(packet=${packet})`);
        this.natsClient!.publish(pattern, serializedPacket.data, {
          headers,
        });
        resolve();
      } catch (err) {
		logger.error(`Exception in dispatchEvent(packet=${packet}): ${(err as Error).message}`, err);
        reject(err);
      }
    });
  }

  protected initializeSerializer(options: NatsOptions['options']) {
	logger.debug(`>>> Entering initializeSerializer(options=${options})`);
    this.serializer = options?.serializer ?? new NatsRecordSerializer();
	logger.debug(`<<< Exiting initializeSerializer(options=${options})`);
  }

  protected initializeDeserializer(options: NatsOptions['options']) {
	logger.debug(`>>> Entering initializeDeserializer(options=${options})`);
    this.deserializer =
      options?.deserializer ?? new NatsResponseJSONDeserializer();
	logger.debug(`<<< Exiting initializeDeserializer(options=${options})`);
  }

  protected mergeHeaders<THeaders = any>(requestHeaders?: THeaders) {
	logger.debug(`>>> Entering mergeHeaders(requestHeaders=${requestHeaders})`);
    if (!requestHeaders && !this.options?.headers) {
      return undefined;
    }

    const headers = requestHeaders ?? natsPackage.headers();
	logger.debug(`mergeHeaders(requestHeaders=${requestHeaders}): headers → ${headers}`);

    for (const [key, value] of Object.entries(this.options?.headers || {})) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

	logger.debug(`<<< Exiting mergeHeaders(requestHeaders=${requestHeaders})`);
    return headers;
  }
}
