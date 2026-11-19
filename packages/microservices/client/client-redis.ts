import { REDIS_DEFAULT_HOST, REDIS_DEFAULT_PORT } from '../constants.js';
import {
  RedisEvents,
  RedisEventsMap,
  RedisStatus,
} from '../events/redis.events.js';
import { ReadPacket, RedisOptions, WritePacket } from '../interfaces/index.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/internal';

// To enable type safety for Redis. This cant be uncommented by default
// because it would require the user to install the ioredis package even if they dont use Redis
// Otherwise, TypeScript would fail to compile the code.
//
// type Redis = import('ioredis').Redis;
type Redis = any;

type RedisOutputOptions = {
  returnBuffers?: boolean;
};
/**
 * @publicApi
 */
export class ClientRedis extends ClientProxy<RedisEvents, RedisStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected pubClient: Redis;
  protected subClient: Redis;
  protected connectionPromise: Promise<any> | null = null;
  protected isManuallyClosed = false;
  protected wasInitialConnectionSuccessful = false;
  protected pendingEventListeners: Array<{
    event: keyof RedisEvents;
    callback: RedisEvents[keyof RedisEvents];
  }> = [];

  constructor(
    protected readonly options: Required<RedisOptions>['options'] &
      RedisOutputOptions,
  ) {
    super();

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public getRequestPattern(pattern: string): string {
	logger.error(`>>> Entering getRequestPattern(pattern=${pattern})`, { "event.action": "getRequestPattern", "logrite.pattern": pattern });
	logger.warn(`<<< Exiting getRequestPattern(pattern=${pattern})`, { "event.action": "getRequestPattern", "logrite.pattern": pattern });
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
	logger.error(`>>> Entering getReplyPattern(pattern=${pattern})`, { "event.action": "getReplyPattern", "logrite.pattern": pattern });
	logger.warn(`<<< Exiting getReplyPattern(pattern=${pattern})`, { "event.action": "getReplyPattern", "logrite.pattern": pattern });
    return `${pattern}.reply`;
  }

  public async close() {
	logger.error('>>> Entering close()', { "event.action": "close" });
    this.isManuallyClosed = true;
    this.handleClose();
	logger.debug(`close(): this.isManuallyClosed → ${this.isManuallyClosed}`, { "event.action": "close" });
    this.pubClient && (await this.pubClient.quit());
    this.subClient && (await this.subClient.quit());
    this.pubClient = this.subClient = null;
	logger.debug(`close(): this.pubClient → ${this.pubClient}`, { "event.action": "close" });
    this.connectionPromise = null;
	logger.debug(`close(): this.connectionPromise → ${this.connectionPromise}`, { "event.action": "close" });
    this.pendingEventListeners = [];
	logger.debug(`close(): this.pendingEventListeners → ${this.pendingEventListeners}`, { "event.action": "close" });
  }

  public connect(): Promise<any> {
	logger.error('>>> Entering connect()', { "event.action": "connect" });
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.connectionPromise = this.handleConnection();
	logger.warn('<<< Exiting connect()', { "event.action": "connect" });
    return this.connectionPromise;
  }

  private async handleConnection(): Promise<any> {
	logger.error('>>> Entering handleConnection()', { "event.action": "handleConnection" });
    this.pubClient = await this.createClient();
    this.subClient = await this.createClient();

    [this.pubClient, this.subClient].forEach((client, index) => {
      const type = index === 0 ? 'pub' : 'sub';
	logger.error(`handleConnection(): type → ${type}`, { "event.action": "handleConnection" });
      this.registerErrorListener(client);
      this.registerReconnectListener(client);
      this.registerReadyListener(client);
      this.registerEndListener(client);
      this.pendingEventListeners.forEach(({ event, callback }) =>
        client.on(event, (...args: [any]) => callback(type, ...args)),
      );
    });
    this.pendingEventListeners = [];
	logger.debug(`handleConnection(): this.pendingEventListeners → ${this.pendingEventListeners}`, { "event.action": "handleConnection" });

    await Promise.all([this.subClient.connect(), this.pubClient.connect()]);
	logger.warn('<<< Exiting handleConnection()', { "event.action": "handleConnection" });
  }

  public async createClient(): Promise<Redis> {
	logger.error('>>> Entering createClient()', { "event.action": "createClient" });
    const clientInfoTag = this.getOptionsProp(this.options, 'clientInfoTag');
    const redisPackage = await loadPackage(
      'ioredis',
      ClientRedis.name,
      () => import('ioredis'),
    );
    const RedisClient = redisPackage.default || redisPackage;
	logger.warn('<<< Exiting createClient()', { "event.action": "createClient" });
    return new RedisClient({
      host: REDIS_DEFAULT_HOST,
      port: REDIS_DEFAULT_PORT,
      ...this.getClientOptions(),
      ...(clientInfoTag && { clientInfoTag }),
      lazyConnect: true,
    });
  }

  public registerErrorListener(client: Redis) {
	logger.error(`>>> Entering registerErrorListener(client=${client})`, { "event.action": "registerErrorListener", "logrite.client": client });
    client.addListener(RedisEventsMap.ERROR, (err: any) =>
      this.logger.error(err),
    );
	logger.warn(`<<< Exiting registerErrorListener(client=${client})`, { "event.action": "registerErrorListener", "logrite.client": client });
  }

  public registerReconnectListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
	logger.error(`>>> Entering registerReconnectListener(client=${client})`, { "event.action": "registerReconnectListener", "logrite.client": client });
    client.on(RedisEventsMap.RECONNECTING, () => {
      if (this.isManuallyClosed) {
        return;
      }

      this.connectionPromise = Promise.reject(
        'Error: Connection lost. Trying to reconnect...',
      );

      // Prevent unhandled rejections
      this.connectionPromise.catch(() => {});
	logger.error(`Exception in registerReconnectListener(client=${client}): (no error binding)`, { "event.action": "registerReconnectListener", "event.category": "process", "logrite.client": client });

      this._status$.next(RedisStatus.RECONNECTING);

      if (this.wasInitialConnectionSuccessful) {
        this.logger.log('Reconnecting to Redis...');
		logger.warn(`<<< Exiting registerReconnectListener(client=${client})`, { "event.action": "registerReconnectListener", "logrite.client": client });
      }
    });
	logger.warn(`<<< Exiting on(event=${event},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
  }

  public registerReadyListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
	logger.error(`>>> Entering registerReadyListener(client=${client})`, { "event.action": "registerReadyListener", "logrite.client": client });
    client.on(RedisEventsMap.READY, () => {
      this.connectionPromise = Promise.resolve();
      this._status$.next(RedisStatus.CONNECTED);

      this.logger.log('Connected to Redis. Subscribing to channels...');

      if (!this.wasInitialConnectionSuccessful) {
		logger.warn(`<<< Exiting registerReadyListener(client=${client})`, { "event.action": "registerReadyListener", "logrite.client": client });
        this.wasInitialConnectionSuccessful = true;
        this.subClient.on(
          this.options.returnBuffers ? 'messageBuffer' : 'message',
          this.createResponseCallback(),
        );
      }
    });
	logger.debug(`registerReadyListener(client=${client}): this.wasInitialConnectionSuccessful → ${this.wasInitialConnectionSuccessful}`, { "event.action": "registerReadyListener", "logrite.client": client });
  }

  public registerEndListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
	logger.error(`>>> Entering registerEndListener(client=${client})`, { "event.action": "registerEndListener", "logrite.client": client });
    client.on('end', () => {
      if (this.isManuallyClosed) {
        return;
      }
      this._status$.next(RedisStatus.DISCONNECTED);
      this.handleClose();

      if (this.getOptionsProp(this.options, 'retryAttempts') === undefined) {
        // When retryAttempts is not specified, the connection will not be re-established
        this.logger.error('Disconnected from Redis.');

        // Clean up client instances and just recreate them when connect is called
        this.pubClient = this.subClient = null;
		logger.debug(`registerEndListener(client=${client}): this.pubClient → ${this.pubClient}`, { "event.action": "registerEndListener", "logrite.client": client });
        this.connectionPromise = null;
      } else {
        this.logger.error('Disconnected from Redis.');
        this.connectionPromise = Promise.reject(
          'Error: Connection lost. Trying to reconnect...',
        );

        // Prevent unhandled rejections
        this.connectionPromise.catch(() => {});
		logger.error(`Exception in registerEndListener(client=${client}): (no error binding)`, { "event.action": "registerEndListener", "event.category": "process", "logrite.client": client });
      }
    });
  }

  public handleClose() {
	logger.error('>>> Entering handleClose()', { "event.action": "handleClose" });
    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
	logger.error(`handleClose(): err → ${err}`, { "event.action": "handleClose" });
      for (const callback of this.routingMap.values()) {
        callback({ err });
      }
      this.routingMap.clear();
    }
    this.subscriptionsCount.clear();
	logger.warn('<<< Exiting handleClose()', { "event.action": "handleClose" });
  }

  public getClientOptions(): Partial<RedisOptions['options']> {
	logger.error('>>> Entering getClientOptions()', { "event.action": "getClientOptions" });
    const retryStrategy = (times: number) => {
        logger.error(`>>> Entering retryStrategy(times=${times})`, { "event.action": "retryStrategy", "logrite.times": times });
	logger.warn('<<< Exiting getClientOptions()', { "event.action": "getClientOptions" });
        return this.createRetryStrategy(times);
    };

    return {
      ...(this.options || {}),
      retryStrategy,
    };
  }

  public on<
    EventKey extends keyof RedisEvents = keyof RedisEvents,
    EventCallback extends RedisEvents[EventKey] = RedisEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.subClient && this.pubClient) {
      this.subClient.on(event, (...args: [any]) => callback('sub', ...args));
      this.pubClient.on(event, (...args: [any]) => callback('pub', ...args));
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public unwrap<T>(): T {
	logger.error('>>> Entering unwrap()', { "event.action": "unwrap" });
    if (!this.pubClient || !this.subClient) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
	logger.warn('<<< Exiting unwrap()', { "event.action": "unwrap" });
    return [this.pubClient, this.subClient] as T;
  }

  public createRetryStrategy(times: number): undefined | number {
	logger.error(`>>> Entering createRetryStrategy(times=${times})`, { "event.action": "createRetryStrategy", "logrite.times": times });
    if (this.isManuallyClosed) {
      return undefined;
    }
    if (!this.getOptionsProp(this.options, 'retryAttempts')) {
      this.logger.error(
        'Redis connection closed and retry attempts not specified',
      );
      return;
    }
    if (times > this.getOptionsProp(this.options, 'retryAttempts', 0)) {
      this.logger.error('Retry time exhausted');
      return;
    }
	logger.warn(`<<< Exiting createRetryStrategy(times=${times})`, { "event.action": "createRetryStrategy", "logrite.times": times });
    return this.getOptionsProp(this.options, 'retryDelay', 5000);
  }

  public createResponseCallback(): (
    channel: string,
    buffer: string,
  ) => Promise<void> {
	logger.error('>>> Entering createResponseCallback()', { "event.action": "createResponseCallback" });
    return async (channel: string, buffer: string) => {
      let packet: any;
      try {
        packet = JSON.parse(buffer);
      } catch (err) {
        this.logger.debug(
          'Redis response packet is not in json format, bypassing...',
        );
        packet = buffer;
      }
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(packet);

      const callback = this.routingMap.get(id);
	logger.error(`createResponseCallback(): callback → ${callback}`, { "event.action": "createResponseCallback" });
      if (!callback) {
        if (Buffer.isBuffer(buffer))
          this.logger.debug(
            'You have to parse your buffer on your own to get id from it, because it is not in json format',
          );
        this.logger.debug(
          'No matching callback found for Redis response packet with id: ' + id,
        );
        return;
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
    };
	logger.warn('<<< Exiting createResponseCallback()', { "event.action": "createResponseCallback" });
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const serializedPacket = this.serializer.serialize(packet);
      const responseChannel = this.getReplyPattern(pattern);
      let subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;

      const publishPacket = () => {
		logger.error('>>> Entering publishPacket()', { "event.action": "publishPacket" });
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
		logger.warn('<<< Exiting publishPacket()', { "event.action": "publishPacket" });
        this.routingMap.set(packet.id, callback);
        this.pubClient.publish(
          this.getRequestPattern(pattern),
          JSON.stringify(serializedPacket),
        );
      };

      if (subscriptionsCount <= 0) {
        this.subClient.subscribe(
          responseChannel,
          (err: any) => !err && publishPacket(),
        );
      } else {
        publishPacket();
      }

      return () => {
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
      return () => {};
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
	logger.error(`>>> Entering dispatchEvent(packet=${packet})`, { "event.action": "dispatchEvent", "logrite.packet": packet });
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize(packet);

	logger.error(`dispatchEvent(packet=${packet}): pattern → ${pattern}`, { "event.action": "dispatchEvent", "logrite.packet": packet });
    return new Promise<void>((resolve, reject) =>
      this.pubClient.publish(pattern, JSON.stringify(serializedPacket), err =>
        err ? reject(err) : resolve(),
      ),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
	logger.error(`>>> Entering unsubscribeFromChannel(channel=${channel})`, { "event.action": "unsubscribeFromChannel", "logrite.channel": channel });
    const subscriptionCount = this.subscriptionsCount.get(channel)!;
    this.subscriptionsCount.set(channel, subscriptionCount - 1);
	logger.error(`unsubscribeFromChannel(channel=${channel}): subscriptionCount → ${subscriptionCount}`, { "event.action": "unsubscribeFromChannel", "logrite.channel": channel });

    if (subscriptionCount - 1 <= 0) {
      this.subClient.unsubscribe(channel);
	logger.warn(`<<< Exiting unsubscribeFromChannel(channel=${channel})`, { "event.action": "unsubscribeFromChannel", "logrite.channel": channel });
    }
  }
}
