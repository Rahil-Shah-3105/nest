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
	logger.debug(`>>> Entering getRequestPattern(pattern=${pattern})`);
	logger.debug(`<<< Exiting getRequestPattern(pattern=${pattern})`);
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
	logger.debug(`>>> Entering getReplyPattern(pattern=${pattern})`);
	logger.debug(`<<< Exiting getReplyPattern(pattern=${pattern})`);
    return `${pattern}.reply`;
  }

  public async close() {
	logger.debug('>>> Entering close()');
    this.isManuallyClosed = true;
    this.handleClose();
    this.pubClient && (await this.pubClient.quit());
	logger.debug(`close(): this.isManuallyClosed → ${this.isManuallyClosed}`);
    this.subClient && (await this.subClient.quit());
    this.pubClient = this.subClient = null;
    this.connectionPromise = null;
	logger.debug(`close(): this.pubClient → ${this.pubClient}`);
    this.pendingEventListeners = [];
	logger.debug(`close(): this.pendingEventListeners → ${this.pendingEventListeners}`);
  }

  public connect(): Promise<any> {
    if (this.connectionPromise) {
	logger.debug('>>> Entering connect()');
      return this.connectionPromise;
    }
    this.connectionPromise = this.handleConnection();
    return this.connectionPromise;
  }

  private async handleConnection(): Promise<any> {
    this.pubClient = await this.createClient();
    this.subClient = await this.createClient();

    [this.pubClient, this.subClient].forEach((client, index) => {
	logger.debug('>>> Entering handleConnection()');
      const type = index === 0 ? 'pub' : 'sub';
      this.registerErrorListener(client);
	logger.debug(`handleConnection(): type → ${type}`);
      this.registerReconnectListener(client);
      this.registerReadyListener(client);
      this.registerEndListener(client);
      this.pendingEventListeners.forEach(({ event, callback }) =>
        client.on(event, (...args: [any]) => callback(type, ...args)),
      );
    });
    this.pendingEventListeners = [];

	logger.debug(`handleConnection(): this.pendingEventListeners → ${this.pendingEventListeners}`);
    await Promise.all([this.subClient.connect(), this.pubClient.connect()]);
	logger.debug('<<< Exiting handleConnection()');
  }

  public async createClient(): Promise<Redis> {
	logger.debug('>>> Entering createClient()');
    const clientInfoTag = this.getOptionsProp(this.options, 'clientInfoTag');
    const redisPackage = await loadPackage(
      'ioredis',
      ClientRedis.name,
      () => import('ioredis'),
    );
    const RedisClient = redisPackage.default || redisPackage;
	logger.debug('<<< Exiting createClient()');
    return new RedisClient({
      host: REDIS_DEFAULT_HOST,
      port: REDIS_DEFAULT_PORT,
      ...this.getClientOptions(),
      ...(clientInfoTag && { clientInfoTag }),
      lazyConnect: true,
    });
  }

  public registerErrorListener(client: Redis) {
	logger.debug(`>>> Entering registerErrorListener(client=${client})`);
    client.addListener(RedisEventsMap.ERROR, (err: any) =>
      this.logger.error(err),
    );
	logger.debug(`<<< Exiting registerErrorListener(client=${client})`);
  }

  public registerReconnectListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
	logger.debug(`>>> Entering registerReconnectListener(client=${client})`);
    client.on(RedisEventsMap.RECONNECTING, () => {
      if (this.isManuallyClosed) {
        return;
      }

      this.connectionPromise = Promise.reject(
        'Error: Connection lost. Trying to reconnect...',
      );

      // Prevent unhandled rejections
      this.connectionPromise.catch(() => {});

      this._status$.next(RedisStatus.RECONNECTING);

      if (this.wasInitialConnectionSuccessful) {
        this.logger.log('Reconnecting to Redis...');
		logger.debug(`<<< Exiting registerReconnectListener(client=${client})`);
      }
    });
	logger.debug(`<<< Exiting on(event=${event},callback=${callback})`);
  }

  public registerReadyListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
	logger.debug(`>>> Entering registerReadyListener(client=${client})`);
    client.on(RedisEventsMap.READY, () => {
      this.connectionPromise = Promise.resolve();
      this._status$.next(RedisStatus.CONNECTED);

      this.logger.log('Connected to Redis. Subscribing to channels...');

      if (!this.wasInitialConnectionSuccessful) {
		logger.debug(`<<< Exiting registerReadyListener(client=${client})`);
        this.wasInitialConnectionSuccessful = true;
        this.subClient.on(
          this.options.returnBuffers ? 'messageBuffer' : 'message',
          this.createResponseCallback(),
        );
      }
    });
	logger.debug(`registerReadyListener(client=${client}): this.wasInitialConnectionSuccessful → ${this.wasInitialConnectionSuccessful}`);
  }

  public registerEndListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
	logger.debug(`>>> Entering registerEndListener(client=${client})`);
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
        this.connectionPromise = null;
      } else {
        this.logger.error('Disconnected from Redis.');
        this.connectionPromise = Promise.reject(
          'Error: Connection lost. Trying to reconnect...',
        );

		logger.debug(`registerEndListener(client=${client}): this.connectionPromise → ${this.connectionPromise}`);
        // Prevent unhandled rejections
        this.connectionPromise.catch(() => {});
		logger.debug(`<<< Exiting registerEndListener(client=${client})`);
      }
    });
	logger.error(`Exception in registerEndListener(client=${client}): (no error binding)`);
  }

  public handleClose() {
	logger.debug('>>> Entering handleClose()');
    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
	logger.debug(`handleClose(): err → ${err}`);
      for (const callback of this.routingMap.values()) {
        callback({ err });
      }
      this.routingMap.clear();
    }
    this.subscriptionsCount.clear();
	logger.debug('<<< Exiting handleClose()');
  }

  public getClientOptions(): Partial<RedisOptions['options']> {
	logger.debug('>>> Entering getClientOptions()');
    const retryStrategy = (times: number) => this.createRetryStrategy(times);

	logger.debug('<<< Exiting getClientOptions()');
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
    if (!this.pubClient || !this.subClient) {
	logger.debug('>>> Entering unwrap()');
	logger.debug('<<< Exiting unwrap()');
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return [this.pubClient, this.subClient] as T;
  }

  public createRetryStrategy(times: number): undefined | number {
    if (this.isManuallyClosed) {
	logger.debug(`>>> Entering createRetryStrategy(times=${times})`);
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
	logger.debug(`<<< Exiting createRetryStrategy(times=${times})`);
      return;
    }
    return this.getOptionsProp(this.options, 'retryDelay', 5000);
  }

  public createResponseCallback(): (
    channel: string,
    buffer: string,
  ) => Promise<void> {
    return async (channel: string, buffer: string) => {
	logger.debug('>>> Entering createResponseCallback()');
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
	logger.debug(`createResponseCallback(): callback → ${callback}`);
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
		logger.debug('<<< Exiting createResponseCallback()');
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
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
		logger.debug('>>> Entering publishPacket()');
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);
		logger.debug('<<< Exiting publishPacket()');
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
	logger.debug(`>>> Entering dispatchEvent(packet=${packet})`);
    const pattern = this.normalizePattern(packet.pattern);
	logger.debug(`dispatchEvent(packet=${packet}): pattern → ${pattern}`);
    const serializedPacket = this.serializer.serialize(packet);

	logger.debug(`dispatchEvent(packet=${packet}): serializedPacket → ${serializedPacket}`);
    return new Promise<void>((resolve, reject) =>
      this.pubClient.publish(pattern, JSON.stringify(serializedPacket), err =>
        err ? reject(err) : resolve(),
      ),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
	logger.debug(`>>> Entering unsubscribeFromChannel(channel=${channel})`);
    const subscriptionCount = this.subscriptionsCount.get(channel)!;
    this.subscriptionsCount.set(channel, subscriptionCount - 1);
	logger.debug(`unsubscribeFromChannel(channel=${channel}): subscriptionCount → ${subscriptionCount}`);

    if (subscriptionCount - 1 <= 0) {
      this.subClient.unsubscribe(channel);
	logger.debug(`<<< Exiting unsubscribeFromChannel(channel=${channel})`);
    }
  }
}
