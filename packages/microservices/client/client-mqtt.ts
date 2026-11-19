import { createRequire } from 'module';
import { EmptyError, fromEvent, lastValueFrom, merge, Observable } from 'rxjs';
import { first, map, share, tap } from 'rxjs/operators';
import { ECONNREFUSED, ENOTFOUND, MQTT_DEFAULT_URL } from '../constants.js';
import {
  MqttEvents,
  MqttEventsMap,
  MqttStatus,
} from '../events/mqtt.events.js';
import { MqttOptions, ReadPacket, WritePacket } from '../interfaces/index.js';
import {
  MqttRecord,
  MqttRecordOptions,
} from '../record-builders/mqtt.record-builder.js';
import { MqttRecordSerializer } from '../serializers/mqtt-record.serializer.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackageSync, isObject } from '@nestjs/common/internal';

let mqttPackage: any = {};

// To enable type safety for MQTT. This cant be uncommented by default
// because it would require the user to install the mqtt package even if they dont use MQTT
// Otherwise, TypeScript would fail to compile the code.
//
// type MqttClient = import('mqtt').MqttClient;
type MqttClient = any;

/**
 * @publicApi
 */
export class ClientMqtt extends ClientProxy<MqttEvents, MqttStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected readonly url: string;
  /* eslint-disable @typescript-eslint/no-redundant-type-constituents */
  protected mqttClient: MqttClient | null = null;
  protected connectionPromise: Promise<any> | null = null;
  protected isInitialConnection = false;
  protected isReconnecting = false;
  protected pendingEventListeners: Array<{
    event: keyof MqttEvents;
    callback: MqttEvents[keyof MqttEvents];
  }> = [];

  constructor(protected readonly options: Required<MqttOptions>['options']) {
    super();
	logger.error(`>>> Entering constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
    this.url = this.getOptionsProp(this.options, 'url') ?? MQTT_DEFAULT_URL;

    mqttPackage = loadPackageSync('mqtt', ClientMqtt.name, () =>
      createRequire(import.meta.url)('mqtt'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
	logger.warn(`<<< Exiting constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
  }

  public getRequestPattern(pattern: string): string {
	logger.error(`>>> Entering getRequestPattern(pattern=${pattern})`, { "event.action": "getRequestPattern", "logrite.pattern": pattern });
	logger.warn(`<<< Exiting getRequestPattern(pattern=${pattern})`, { "event.action": "getRequestPattern", "logrite.pattern": pattern });
    return pattern;
  }

  public getResponsePattern(pattern: string): string {
	logger.error(`>>> Entering getResponsePattern(pattern=${pattern})`, { "event.action": "getResponsePattern", "logrite.pattern": pattern });
	logger.warn(`<<< Exiting getResponsePattern(pattern=${pattern})`, { "event.action": "getResponsePattern", "logrite.pattern": pattern });
    return `${pattern}/reply`;
  }

  public async close() {
	logger.error('>>> Entering close()', { "event.action": "close" });
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
    }
    this.mqttClient = null;
	logger.debug(`close(): this.mqttClient → ${this.mqttClient}`, { "event.action": "close" });
    this.connectionPromise = null;
	logger.debug(`close(): this.connectionPromise → ${this.connectionPromise}`, { "event.action": "close" });
    this.pendingEventListeners = [];
	logger.debug(`close(): this.pendingEventListeners → ${this.pendingEventListeners}`, { "event.action": "close" });
  }

  public async connect(): Promise<any> {
	logger.error('>>> Entering connect()', { "event.action": "connect" });
    if (this.mqttClient) {
      return this.connectionPromise!;
    }
    this.mqttClient = this.createClient();
    this.registerErrorListener(this.mqttClient);
    this.registerOfflineListener(this.mqttClient);
    this.registerReconnectListener(this.mqttClient);
    this.registerConnectListener(this.mqttClient);
    this.registerDisconnectListener(this.mqttClient);
    this.registerCloseListener(this.mqttClient);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.mqttClient!.on(event, callback),
    );
    this.pendingEventListeners = [];
	logger.debug(`connect(): this.pendingEventListeners → ${this.pendingEventListeners}`, { "event.action": "connect" });

    const connect$ = this.connect$(this.mqttClient);
    this.connectionPromise = lastValueFrom(
      this.mergeCloseEvent(this.mqttClient, connect$).pipe(share()),
    ).catch(err => {
	logger.error('Exception in connect()', { "event.action": "connect", "event.category": "process" });
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    });
	logger.error(`>>> Entering mergeCloseEvent(instance=${instance},source$=${source$})`, { "event.action": "mergeCloseEvent", "logrite.instance": instance, "logrite.source$": source$ });
	logger.warn(`<<< Exiting mergeCloseEvent(instance=${instance},source$=${source$})`, { "event.action": "mergeCloseEvent", "logrite.instance": instance, "logrite.source$": source$ });
	logger.warn('<<< Exiting connect()', { "event.action": "connect" });
    return this.connectionPromise;
  }

  public mergeCloseEvent<T = any>(
    instance: MqttClient,
    source$: Observable<T>,
  ): Observable<T> {
    const close$ = fromEvent(instance, MqttEventsMap.CLOSE).pipe(
      tap({
        next: () => {
          this._status$.next(MqttStatus.CLOSED);
        },
      }),
      map((err: any) => {
        throw err;
      }),
    );
    return merge(source$, close$).pipe(first());
  }

  public createClient(): MqttClient {
	logger.error('>>> Entering createClient()', { "event.action": "createClient" });
	logger.warn('<<< Exiting createClient()', { "event.action": "createClient" });
    return mqttPackage.connect(this.url, this.options as MqttOptions);
  }

  public registerErrorListener(client: MqttClient) {
	logger.error(`>>> Entering registerErrorListener(client=${client})`, { "event.action": "registerErrorListener", "logrite.client": client });
    client.on(MqttEventsMap.ERROR, (err: any) => {
      if (err.code === ECONNREFUSED || err.code === ENOTFOUND) {
        return;
      }
      this.logger.error(err);
    });
	logger.warn(`<<< Exiting registerErrorListener(client=${client})`, { "event.action": "registerErrorListener", "logrite.client": client });
  }

  public registerOfflineListener(client: MqttClient) {
	logger.error(`>>> Entering registerOfflineListener(client=${client})`, { "event.action": "registerOfflineListener", "logrite.client": client });
    client.on(MqttEventsMap.OFFLINE, () => {
      this.connectionPromise = Promise.reject(
        'Error: Connection lost. Trying to reconnect...',
      );

      // Prevent unhandled rejections
      this.connectionPromise.catch(() => {});
	logger.error(`Exception in registerOfflineListener(client=${client}): (no error binding)`, { "event.action": "registerOfflineListener", "event.category": "process", "logrite.client": client });
      this.logger.error('MQTT broker went offline.');
    });
	logger.warn(`<<< Exiting registerOfflineListener(client=${client})`, { "event.action": "registerOfflineListener", "logrite.client": client });
  }

  public registerReconnectListener(client: MqttClient) {
	logger.error(`>>> Entering registerReconnectListener(client=${client})`, { "event.action": "registerReconnectListener", "logrite.client": client });
    client.on(MqttEventsMap.RECONNECT, () => {
      this.isReconnecting = true;
	logger.debug(`registerReconnectListener(client=${client}): this.isReconnecting → ${this.isReconnecting}`, { "event.action": "registerReconnectListener", "logrite.client": client });
      this._status$.next(MqttStatus.RECONNECTING);

      this.logger.log('MQTT connection lost. Trying to reconnect...');
    });
	logger.warn(`<<< Exiting registerReconnectListener(client=${client})`, { "event.action": "registerReconnectListener", "logrite.client": client });
  }

  public registerDisconnectListener(client: MqttClient) {
	logger.error(`>>> Entering registerDisconnectListener(client=${client})`, { "event.action": "registerDisconnectListener", "logrite.client": client });
    client.on(MqttEventsMap.DISCONNECT, () => {
      this._status$.next(MqttStatus.DISCONNECTED);
    });
	logger.warn(`<<< Exiting registerDisconnectListener(client=${client})`, { "event.action": "registerDisconnectListener", "logrite.client": client });
  }

  public registerCloseListener(client: MqttClient) {
	logger.error(`>>> Entering registerCloseListener(client=${client})`, { "event.action": "registerCloseListener", "logrite.client": client });
    client.on(MqttEventsMap.CLOSE, () => {
      this._status$.next(MqttStatus.CLOSED);
    });
	logger.warn(`<<< Exiting registerCloseListener(client=${client})`, { "event.action": "registerCloseListener", "logrite.client": client });
  }

  public registerConnectListener(client: MqttClient) {
	logger.error(`>>> Entering registerConnectListener(client=${client})`, { "event.action": "registerConnectListener", "logrite.client": client });
    client.on(MqttEventsMap.CONNECT, () => {
      this.isReconnecting = false;
	logger.debug(`registerConnectListener(client=${client}): this.isReconnecting → ${this.isReconnecting}`, { "event.action": "registerConnectListener", "logrite.client": client });
      this._status$.next(MqttStatus.CONNECTED);

      this.logger.log('Connected to MQTT broker');
      this.connectionPromise = Promise.resolve();

      if (!this.isInitialConnection) {
        this.isInitialConnection = true;
		logger.debug(`registerConnectListener(client=${client}): this.isInitialConnection → ${this.isInitialConnection}`, { "event.action": "registerConnectListener", "logrite.client": client });
        client.on('message', this.createResponseCallback());
		logger.warn(`<<< Exiting registerConnectListener(client=${client})`, { "event.action": "registerConnectListener", "logrite.client": client });
      }
    });
  }

  public on<
    EventKey extends keyof MqttEvents = keyof MqttEvents,
    EventCallback extends MqttEvents[EventKey] = MqttEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
	logger.error(`>>> Entering on(event=${event},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
    if (this.mqttClient) {
      this.mqttClient.on(event, callback as any);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public unwrap<T>(): T {
	logger.error('>>> Entering unwrap()', { "event.action": "unwrap" });
    if (!this.mqttClient) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
	logger.warn('<<< Exiting unwrap()', { "event.action": "unwrap" });
    return this.mqttClient as T;
  }

  public createResponseCallback(): (channel: string, buffer: Buffer) => any {
    return async (channel: string, buffer: Buffer) => {
      const packet = JSON.parse(buffer.toString());
	logger.error(`createResponseCallback(): packet → ${packet}`, { "event.action": "createResponseCallback" });
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(packet);

      const callback = this.routingMap.get(id);
	logger.error(`createResponseCallback(): callback → ${callback}`, { "event.action": "createResponseCallback" });
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
    };
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const responseChannel = this.getResponsePattern(pattern);

      let subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;

      const publishPacket = () => {
		logger.error('>>> Entering publishPacket()', { "event.action": "publishPacket" });
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);

        const options =
          isObject(packet?.data) && packet.data instanceof MqttRecord
            ? packet.data.options
            : undefined;
        delete packet?.data?.options;
        const serializedPacket: string | Buffer =
          this.serializer.serialize(packet);
		logger.warn('<<< Exiting publishPacket()', { "event.action": "publishPacket" });

        this.mqttClient!.publish(
          this.getRequestPattern(pattern),
          serializedPacket,
          this.mergePacketOptions(options),
        );
      };

      if (subscriptionsCount <= 0) {
        this.mqttClient!.subscribe(
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
    const options =
      isObject(packet?.data) && packet.data instanceof MqttRecord
        ? packet.data.options
        : undefined;
		logger.error(`dispatchEvent(packet=${packet}): pattern → ${pattern}`, { "event.action": "dispatchEvent", "logrite.packet": packet });
    delete packet?.data?.options;

    const serializedPacket: string | Buffer = this.serializer.serialize(packet);
	logger.warn(`<<< Exiting dispatchEvent(packet=${packet})`, { "event.action": "dispatchEvent", "logrite.packet": packet });
    return new Promise<void>((resolve, reject) =>
      this.mqttClient!.publish(
        pattern,
        serializedPacket,
        this.mergePacketOptions(options),
        (err: any) => (err ? reject(err) : resolve()),
      ),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
	logger.error(`>>> Entering unsubscribeFromChannel(channel=${channel})`, { "event.action": "unsubscribeFromChannel", "logrite.channel": channel });
    const subscriptionCount = this.subscriptionsCount.get(channel)!;
    this.subscriptionsCount.set(channel, subscriptionCount - 1);
	logger.error(`unsubscribeFromChannel(channel=${channel}): subscriptionCount → ${subscriptionCount}`, { "event.action": "unsubscribeFromChannel", "logrite.channel": channel });

    if (subscriptionCount - 1 <= 0) {
      this.mqttClient!.unsubscribe(channel);
	logger.warn(`<<< Exiting unsubscribeFromChannel(channel=${channel})`, { "event.action": "unsubscribeFromChannel", "logrite.channel": channel });
    }
  }

  protected initializeSerializer(options: MqttOptions['options']) {
	logger.error(`>>> Entering initializeSerializer(options=${options})`, { "event.action": "initializeSerializer", "logrite.options": options });
    this.serializer = options?.serializer ?? new MqttRecordSerializer();
	logger.warn(`<<< Exiting initializeSerializer(options=${options})`, { "event.action": "initializeSerializer", "logrite.options": options });
  }

  protected mergePacketOptions(
    requestOptions?: MqttRecordOptions,
  ): MqttRecordOptions | undefined {
	logger.error(`>>> Entering mergePacketOptions(requestOptions=${requestOptions})`, { "event.action": "mergePacketOptions", "logrite.requestOptions": requestOptions });
    if (!requestOptions && !this.options?.userProperties) {
      return undefined;
    }

    // Cant just spread objects as MQTT won't deliver
    // any message with empty object as "userProperties" field
    // @url https://github.com/nestjs/nest/issues/14079
    let options: MqttRecordOptions = {};
    if (requestOptions) {
      options = { ...requestOptions };
    }
    if (this.options?.userProperties) {
      options.properties = {
        ...options.properties,
        userProperties: {
          ...this.options?.userProperties,
          ...options.properties?.userProperties,
        },
      };
    }
	logger.warn(`<<< Exiting mergePacketOptions(requestOptions=${requestOptions})`, { "event.action": "mergePacketOptions", "logrite.requestOptions": requestOptions });
    return options;
  }
}
