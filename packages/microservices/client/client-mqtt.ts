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
	logger.debug(`>>> Entering constructor(options=${options})`);
    this.url = this.getOptionsProp(this.options, 'url') ?? MQTT_DEFAULT_URL;

    mqttPackage = loadPackageSync('mqtt', ClientMqtt.name, () =>
      createRequire(import.meta.url)('mqtt'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
	logger.debug(`<<< Exiting constructor(options=${options})`);
  }

  public getRequestPattern(pattern: string): string {
	logger.debug(`>>> Entering getRequestPattern(pattern=${pattern})`);
	logger.debug(`<<< Exiting getRequestPattern(pattern=${pattern})`);
    return pattern;
  }

  public getResponsePattern(pattern: string): string {
	logger.debug(`>>> Entering getResponsePattern(pattern=${pattern})`);
	logger.debug(`<<< Exiting getResponsePattern(pattern=${pattern})`);
    return `${pattern}/reply`;
  }

  public async close() {
	logger.debug('>>> Entering close()');
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
    }
    this.mqttClient = null;
    this.connectionPromise = null;
	logger.debug(`close(): this.mqttClient → ${this.mqttClient}`);
	logger.debug(`close(): this.connectionPromise → ${this.connectionPromise}`);
    this.pendingEventListeners = [];
  }

  public async connect(): Promise<any> {
    if (this.mqttClient) {
	logger.debug('>>> Entering connect()');
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

	logger.debug(`connect(): this.pendingEventListeners → ${this.pendingEventListeners}`);
    const connect$ = this.connect$(this.mqttClient);
    this.connectionPromise = lastValueFrom(
      this.mergeCloseEvent(this.mqttClient, connect$).pipe(share()),
    ).catch(err => {
	logger.error('Exception in connect()');
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    });
	logger.debug(`>>> Entering mergeCloseEvent(instance=${instance},source$=${source$})`);
	logger.debug(`<<< Exiting mergeCloseEvent(instance=${instance},source$=${source$})`);
	logger.debug('<<< Exiting connect()');
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
	logger.debug('>>> Entering createClient()');
	logger.debug('<<< Exiting createClient()');
    return mqttPackage.connect(this.url, this.options as MqttOptions);
  }

  public registerErrorListener(client: MqttClient) {
	logger.debug(`>>> Entering registerErrorListener(client=${client})`);
    client.on(MqttEventsMap.ERROR, (err: any) => {
      if (err.code === ECONNREFUSED || err.code === ENOTFOUND) {
        return;
      }
      this.logger.error(err);
    });
	logger.debug(`<<< Exiting registerErrorListener(client=${client})`);
  }

  public registerOfflineListener(client: MqttClient) {
	logger.debug(`>>> Entering registerOfflineListener(client=${client})`);
    client.on(MqttEventsMap.OFFLINE, () => {
      this.connectionPromise = Promise.reject(
        'Error: Connection lost. Trying to reconnect...',
      );

      // Prevent unhandled rejections
      this.connectionPromise.catch(() => {});
      this.logger.error('MQTT broker went offline.');
    });
	logger.debug(`<<< Exiting registerOfflineListener(client=${client})`);
  }

  public registerReconnectListener(client: MqttClient) {
	logger.debug(`>>> Entering registerReconnectListener(client=${client})`);
    client.on(MqttEventsMap.RECONNECT, () => {
      this.isReconnecting = true;
      this._status$.next(MqttStatus.RECONNECTING);
	logger.debug(`registerReconnectListener(client=${client}): this.isReconnecting → ${this.isReconnecting}`);

      this.logger.log('MQTT connection lost. Trying to reconnect...');
    });
	logger.debug(`<<< Exiting registerReconnectListener(client=${client})`);
  }

  public registerDisconnectListener(client: MqttClient) {
	logger.debug(`>>> Entering registerDisconnectListener(client=${client})`);
    client.on(MqttEventsMap.DISCONNECT, () => {
      this._status$.next(MqttStatus.DISCONNECTED);
    });
	logger.debug(`<<< Exiting registerDisconnectListener(client=${client})`);
  }

  public registerCloseListener(client: MqttClient) {
	logger.debug(`>>> Entering registerCloseListener(client=${client})`);
    client.on(MqttEventsMap.CLOSE, () => {
      this._status$.next(MqttStatus.CLOSED);
    });
	logger.debug(`<<< Exiting registerCloseListener(client=${client})`);
  }

  public registerConnectListener(client: MqttClient) {
	logger.debug(`>>> Entering registerConnectListener(client=${client})`);
    client.on(MqttEventsMap.CONNECT, () => {
      this.isReconnecting = false;
      this._status$.next(MqttStatus.CONNECTED);
	logger.debug(`registerConnectListener(client=${client}): this.isReconnecting → ${this.isReconnecting}`);

      this.logger.log('Connected to MQTT broker');
      this.connectionPromise = Promise.resolve();

      if (!this.isInitialConnection) {
        this.isInitialConnection = true;
        client.on('message', this.createResponseCallback());
      }
    });
  }

  public on<
    EventKey extends keyof MqttEvents = keyof MqttEvents,
    EventCallback extends MqttEvents[EventKey] = MqttEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
	logger.debug(`>>> Entering on(event=${event},callback=${callback})`);
    if (this.mqttClient) {
      this.mqttClient.on(event, callback as any);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public unwrap<T>(): T {
    if (!this.mqttClient) {
	logger.debug('>>> Entering unwrap()');
	logger.debug('<<< Exiting unwrap()');
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.mqttClient as T;
  }

  public createResponseCallback(): (channel: string, buffer: Buffer) => any {
    return async (channel: string, buffer: Buffer) => {
      const packet = JSON.parse(buffer.toString());
	logger.debug(`createResponseCallback(): packet → ${packet}`);
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(packet);

      const callback = this.routingMap.get(id);
	logger.debug(`createResponseCallback(): callback → ${callback}`);
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
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
		logger.debug('>>> Entering publishPacket()');
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);

        const options =
          isObject(packet?.data) && packet.data instanceof MqttRecord
            ? packet.data.options
            : undefined;
        delete packet?.data?.options;
        const serializedPacket: string | Buffer =
          this.serializer.serialize(packet);
		logger.debug('<<< Exiting publishPacket()');

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
	logger.debug(`>>> Entering dispatchEvent(packet=${packet})`);
    const pattern = this.normalizePattern(packet.pattern);
	logger.debug(`dispatchEvent(packet=${packet}): pattern → ${pattern}`);
    const options =
      isObject(packet?.data) && packet.data instanceof MqttRecord
        ? packet.data.options
        : undefined;
    delete packet?.data?.options;

    const serializedPacket: string | Buffer = this.serializer.serialize(packet);
	logger.debug(`<<< Exiting dispatchEvent(packet=${packet})`);
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
	logger.debug(`>>> Entering unsubscribeFromChannel(channel=${channel})`);
    const subscriptionCount = this.subscriptionsCount.get(channel)!;
    this.subscriptionsCount.set(channel, subscriptionCount - 1);
	logger.debug(`unsubscribeFromChannel(channel=${channel}): subscriptionCount → ${subscriptionCount}`);

    if (subscriptionCount - 1 <= 0) {
      this.mqttClient!.unsubscribe(channel);
	logger.debug(`<<< Exiting unsubscribeFromChannel(channel=${channel})`);
    }
  }

  protected initializeSerializer(options: MqttOptions['options']) {
	logger.debug(`>>> Entering initializeSerializer(options=${options})`);
    this.serializer = options?.serializer ?? new MqttRecordSerializer();
	logger.debug(`<<< Exiting initializeSerializer(options=${options})`);
  }

  protected mergePacketOptions(
    requestOptions?: MqttRecordOptions,
  ): MqttRecordOptions | undefined {
    if (!requestOptions && !this.options?.userProperties) {
	logger.debug(`>>> Entering mergePacketOptions(requestOptions=${requestOptions})`);
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
	logger.debug(`mergePacketOptions(requestOptions=${requestOptions}): options.properties → ${options.properties}`);
	logger.debug(`<<< Exiting mergePacketOptions(requestOptions=${requestOptions})`);
    return options;
  }
}
