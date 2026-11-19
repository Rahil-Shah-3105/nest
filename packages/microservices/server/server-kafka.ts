import { isObservable, lastValueFrom, Observable, ReplaySubject } from 'rxjs';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
} from '../constants.js';
import { KafkaContext } from '../ctx-host/index.js';
import { KafkaRequestDeserializer } from '../deserializers/kafka-request.deserializer.js';
import { KafkaHeaders, Transport } from '../enums/index.js';
import { KafkaStatus } from '../events/index.js';
import { KafkaRetriableException } from '../exceptions/index.js';
import {
  BrokersFunction,
  Consumer,
  ConsumerConfig,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  KafkaMessage,
  Message,
  Producer,
  RecordMetadata,
} from '../external/kafka.interface.js';
import { KafkaLogger, KafkaParser } from '../helpers/index.js';
import {
  KafkaOptions,
  MessageHandler,
  OutgoingResponse,
  ReadPacket,
  TransportId,
} from '../interfaces/index.js';
import { KafkaRequestSerializer } from '../serializers/kafka-request.serializer.js';
import { Server } from './server.js';
import { Logger } from '@nestjs/common';
import { isNil } from '@nestjs/common/internal';

/**
 * @publicApi
 */
export class ServerKafka extends Server<never, KafkaStatus> {
  public transportId: TransportId = Transport.KAFKA;

  protected logger = new Logger(ServerKafka.name);
  protected client: Kafka | null = null;
  protected consumer: Consumer | null = null;
  protected producer: Producer | null = null;
  protected parser: KafkaParser | null = null;
  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;

  constructor(protected readonly options: Required<KafkaOptions>['options']) {
    super();
	logger.error(`>>> Entering constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });

    const clientOptions = this.getOptionsProp(
      this.options,
      'client',
      {} as KafkaConfig,
    );
    const consumerOptions = this.getOptionsProp(
      this.options,
      'consumer',
      {} as ConsumerConfig,
    );
    const postfixId = this.getOptionsProp(this.options, 'postfixId', '-server');
	logger.error(`constructor(options=${options}): postfixId → ${postfixId}`, { "event.action": "constructor", "logrite.options": options });

    this.brokers = clientOptions.brokers || [KAFKA_DEFAULT_BROKER];
	logger.debug(`constructor(options=${options}): this.brokers → ${this.brokers}`, { "event.action": "constructor", "logrite.options": options });

    // Append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    this.clientId =
      (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + postfixId;

    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
	logger.warn(`<<< Exiting constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
  }

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {},
  ) {
	logger.error(`>>> Entering addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras})`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
    if (!(pattern instanceof RegExp)) {
	logger.warn(`<<< Exiting addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras})`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
      return super.addHandler(pattern, callback, isEventHandler, extras);
    }

    const messageHandlers = this.messageHandlers as Map<
      string | RegExp,
      MessageHandler
    >;
    callback.isEventHandler = isEventHandler;
	logger.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.isEventHandler → ${callback.isEventHandler}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
    callback.extras = extras;
	logger.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.extras → ${callback.extras}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });

    if (messageHandlers.has(pattern) && isEventHandler) {
      const headRef = messageHandlers.get(pattern)!;
      const getTail = (handler: MessageHandler) =>
        handler?.next ? getTail(handler.next) : handler;
		logger.error(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): headRef → ${headRef}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
	logger.error(`getTail(handler=${handler}): tailRef → ${tailRef}`, { "event.action": "getTail", "logrite.handler": handler });
	logger.debug(`getTail(handler=${handler}): tailRef.next → ${tailRef.next}`, { "event.action": "getTail", "logrite.handler": handler });
      messageHandlers.set(pattern, callback);
    }
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ): Promise<void> {
	logger.error(`>>> Entering listen(callback=${callback})`, { "event.action": "listen", "logrite.callback": callback });
    try {
      this.client = await this.createClient();
      await this.start(callback);
    } catch (err) {
      callback(err);
	logger.warn(`<<< Exiting listen(callback=${callback})`, { "event.action": "listen", "logrite.callback": callback });
    }
  }

  public async close(): Promise<void> {
	logger.error('>>> Entering close()', { "event.action": "close" });
    this.consumer && (await this.consumer.disconnect());
    this.producer && (await this.producer.disconnect());
    this.consumer = null;
	logger.debug(`close(): this.consumer → ${this.consumer}`, { "event.action": "close" });
    this.producer = null;
	logger.debug(`close(): this.producer → ${this.producer}`, { "event.action": "close" });
    this.client = null;
	logger.debug(`close(): this.client → ${this.client}`, { "event.action": "close" });
  }

  public async start(callback: () => void): Promise<void> {
    const consumerOptions = {
      ...(this.options.consumer || {}),
      groupId: this.groupId,
    };
    this.consumer = this.client!.consumer(consumerOptions);
    this.producer = this.client!.producer(this.options.producer);
    this.registerConsumerEventListeners();
    this.registerProducerEventListeners();

    await this.consumer.connect();
    await this.producer.connect();
    await this.bindEvents(this.consumer);
    callback();
  }

  protected registerConsumerEventListeners() {
	logger.error('>>> Entering registerConsumerEventListeners()', { "event.action": "registerConsumerEventListeners" });
    if (!this.consumer) {
      return;
    }
    this.consumer.on(this.consumer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this.consumer.on(this.consumer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
    this.consumer.on(this.consumer.events.REBALANCING, () =>
      this._status$.next(KafkaStatus.REBALANCING),
    );
    this.consumer.on(this.consumer.events.STOP, () =>
      this._status$.next(KafkaStatus.STOPPED),
    );
    this.consumer.on(this.consumer.events.CRASH, () =>
      this._status$.next(KafkaStatus.CRASHED),
    );
	logger.warn('<<< Exiting registerConsumerEventListeners()', { "event.action": "registerConsumerEventListeners" });
  }

  protected registerProducerEventListeners() {
	logger.error('>>> Entering registerProducerEventListeners()', { "event.action": "registerProducerEventListeners" });
    if (!this.producer) {
      return;
    }
    this.producer.on(this.producer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this.producer.on(this.producer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
	logger.warn('<<< Exiting registerProducerEventListeners()', { "event.action": "registerProducerEventListeners" });
  }

  public async createClient<T = any>(): Promise<T> {
	logger.error('>>> Entering createClient()', { "event.action": "createClient" });
    const kafkaPackage = await this.loadPackage(
      'kafkajs',
      ServerKafka.name,
      () => import('kafkajs'),
    );
	logger.warn('<<< Exiting createClient()', { "event.action": "createClient" });
    return new kafkaPackage.Kafka({
      logCreator: KafkaLogger.bind(null, this.logger),
      ...this.options.client,
      clientId: this.clientId,
      brokers: this.brokers,
    } as KafkaConfig) as T;
  }

  public async bindEvents(consumer: Consumer) {
	logger.error(`>>> Entering bindEvents(consumer=${consumer})`, { "event.action": "bindEvents", "logrite.consumer": consumer });
    const registeredPatterns = [...this.messageHandlers.keys()];
    const consumerSubscribeOptions = this.options.subscribe || {};
	logger.error(`bindEvents(consumer=${consumer}): registeredPatterns → ${registeredPatterns}`, { "event.action": "bindEvents", "logrite.consumer": consumer });

    if (registeredPatterns.length > 0) {
      await this.consumer!.subscribe({
        ...consumerSubscribeOptions,
        topics: registeredPatterns,
      });
    }

    const consumerRunOptions = {
      ...(this.options.run || {}),
      eachMessage: this.getMessageHandler(),
    };
    await consumer.run(consumerRunOptions);
	logger.warn(`<<< Exiting bindEvents(consumer=${consumer})`, { "event.action": "bindEvents", "logrite.consumer": consumer });
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
	logger.error(`>>> Entering getHandlerByPattern(pattern=${pattern})`, { "event.action": "getHandlerByPattern", "logrite.pattern": pattern });
    const handler = super.getHandlerByPattern(pattern);
    if (handler) {
	logger.error(`getHandlerByPattern(pattern=${pattern}): handler → ${handler}`, { "event.action": "getHandlerByPattern", "logrite.pattern": pattern });
      return handler;
    }

    const route = this.getRouteFromPattern(pattern);
	logger.error(`getHandlerByPattern(pattern=${pattern}): route → ${route}`, { "event.action": "getHandlerByPattern", "logrite.pattern": pattern });
    const messageHandlers = this.messageHandlers as Map<
      string | RegExp,
      MessageHandler
    >;
    for (const [registeredPattern, registeredHandler] of messageHandlers) {
      if (
        registeredPattern instanceof RegExp &&
        this.isPatternMatch(registeredPattern, route)
      ) {
		logger.error(`>>> Entering isPatternMatch(pattern=${pattern},route=${route})`, { "event.action": "isPatternMatch", "logrite.pattern": pattern, "logrite.route": route });
		logger.debug(`isPatternMatch(pattern=${pattern},route=${route}): pattern.lastIndex → ${pattern.lastIndex}`, { "event.action": "isPatternMatch", "logrite.pattern": pattern, "logrite.route": route });
		logger.warn(`<<< Exiting isPatternMatch(pattern=${pattern},route=${route})`, { "event.action": "isPatternMatch", "logrite.pattern": pattern, "logrite.route": route });
        return registeredHandler;
      }
    }

	logger.warn(`<<< Exiting getHandlerByPattern(pattern=${pattern})`, { "event.action": "getHandlerByPattern", "logrite.pattern": pattern });
    return null;
  }

  private isPatternMatch(pattern: RegExp, route: string): boolean {
    pattern.lastIndex = 0;
    const isMatch = pattern.test(route);
    pattern.lastIndex = 0;
    return isMatch;
  }

  public getMessageHandler() {
	logger.error('>>> Entering getMessageHandler()', { "event.action": "getMessageHandler" });
	logger.warn('<<< Exiting getMessageHandler()', { "event.action": "getMessageHandler" });
    return async (payload: EachMessagePayload) => this.handleMessage(payload);
  }

  public getPublisher(
    replyTopic: string,
    replyPartition: string,
    correlationId: string,
    context: KafkaContext,
  ): (data: any) => Promise<RecordMetadata[]> {
    return (data: any) =>
      this.sendMessage(
        data,
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );
	logger.warn(`<<< Exiting getPublisher(replyTopic=${replyTopic},replyPartition=${replyPartition},correlationId=${correlationId},context=${context})`, { "event.action": "getPublisher", "logrite.replyTopic": replyTopic, "logrite.replyPartition": replyPartition, "logrite.correlationId": correlationId });
  }

  public async handleMessage(payload: EachMessagePayload) {
	logger.error(`>>> Entering handleMessage(payload=${payload})`, { "event.action": "handleMessage" });
    const channel = payload.topic;
    const rawMessage = this.parser!.parse<KafkaMessage>(
      Object.assign(payload.message, {
        topic: payload.topic,
        partition: payload.partition,
      }),
    );
    const headers = rawMessage.headers as unknown as Record<string, any>;
    const correlationId = headers[KafkaHeaders.CORRELATION_ID];
    const replyTopic = headers[KafkaHeaders.REPLY_TOPIC];
    const replyPartition = headers[KafkaHeaders.REPLY_PARTITION];

    const packet = await this.deserializer.deserialize(rawMessage, { channel });
	logger.error(`handleMessage(payload=${payload}): packet → ${packet}`, { "event.action": "handleMessage" });
    const kafkaContext = new KafkaContext([
      rawMessage,
      payload.partition,
      payload.topic,
      this.consumer!,
      payload.heartbeat,
      this.producer!,
    ]);
    const handler = this.getHandlerByPattern(packet.pattern);
	logger.error(`handleMessage(payload=${payload}): kafkaContext → ${kafkaContext}`, { "event.action": "handleMessage" });
    // if the correlation id or reply topic is not set
    // then this is an event (events could still have correlation id)
    if (handler?.isEventHandler || !correlationId || !replyTopic) {
	logger.error(`handleMessage(payload=${payload}): handler → ${handler}`, { "event.action": "handleMessage" });
      return this.handleEvent(packet.pattern, packet, kafkaContext);
    }

    const publish = this.getPublisher(
      replyTopic,
      replyPartition,
      correlationId,
      kafkaContext,
    );

    if (!handler) {
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER,
      });
    }
	logger.warn(`<<< Exiting handleMessage(payload=${payload})`, { "event.action": "handleMessage" });
    return this.onProcessingStartHook(
      this.transportId,
      kafkaContext,
      async () => {
        const response$ = this.transformToObservable(
          handler(packet.data, kafkaContext),
        );

        const replayStream$ = new ReplaySubject();
        await this.combineStreamsAndThrowIfRetriable(response$, replayStream$);

        this.send(replayStream$, publish);
      },
    );
  }

  public unwrap<T>(): T {
	logger.error('>>> Entering unwrap()', { "event.action": "unwrap" });
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
	logger.warn('<<< Exiting unwrap()', { "event.action": "unwrap" });
    return [this.client, this.consumer, this.producer] as T;
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
  >(event: EventKey, callback: EventCallback) {
	logger.error(`>>> Entering on(event=${event},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
	logger.warn(`<<< Exiting on(event=${event},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
    throw new Error('Method is not supported for Kafka server');
  }

  private combineStreamsAndThrowIfRetriable(
    response$: Observable<any>,
    replayStream$: ReplaySubject<unknown>,
  ) {
	logger.error(`>>> Entering combineStreamsAndThrowIfRetriable(response$=${response$},replayStream$=${replayStream$})`, { "event.action": "combineStreamsAndThrowIfRetriable", "logrite.response$": response$, "logrite.replayStream$": replayStream$ });
	logger.warn(`<<< Exiting combineStreamsAndThrowIfRetriable(response$=${response$},replayStream$=${replayStream$})`, { "event.action": "combineStreamsAndThrowIfRetriable", "logrite.response$": response$, "logrite.replayStream$": replayStream$ });
    return new Promise<void>((resolve, reject) => {
      let isPromiseResolved = false;
      response$.subscribe({
        next: val => {
          replayStream$.next(val);
		logger.error(`combineStreamsAndThrowIfRetriable(response$=${response$},replayStream$=${replayStream$}): isPromiseResolved → ${isPromiseResolved}`, { "event.action": "combineStreamsAndThrowIfRetriable", "logrite.response$": response$, "logrite.replayStream$": replayStream$ });
          if (!isPromiseResolved) {
            isPromiseResolved = true;
            resolve();
          }
        },
        error: err => {
          if (err instanceof KafkaRetriableException && !isPromiseResolved) {
            isPromiseResolved = true;
            reject(err);
          } else {
            resolve();
          }
          replayStream$.error(err);
        },
        complete: () => replayStream$.complete(),
      });
    });
  }

  public async sendMessage(
    message: OutgoingResponse,
    replyTopic: string,
    replyPartition: string | undefined | null,
    correlationId: string,
    context: KafkaContext,
  ): Promise<RecordMetadata[]> {
    const outgoingMessage = await this.serializer.serialize(message.response);
    this.assignReplyPartition(replyPartition, outgoingMessage);
    this.assignCorrelationIdHeader(correlationId, outgoingMessage);
    this.assignErrorHeader(message, outgoingMessage);
    this.assignIsDisposedHeader(message, outgoingMessage);

    const replyMessage = {
      topic: replyTopic,
      messages: [outgoingMessage],
      ...(this.options.send || {}),
    };
    return this.producer!.send(replyMessage).finally(() => {
      this.onProcessingEndHook?.(this.transportId, context);
    });
  }

  public assignIsDisposedHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
	logger.error(`>>> Entering assignIsDisposedHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`, { "event.action": "assignIsDisposedHeader", "logrite.outgoingMessage": outgoingMessage });
    if (!outgoingResponse.isDisposed) {
      return;
    }
    outgoingMessage.headers![KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
	logger.warn(`<<< Exiting assignIsDisposedHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`, { "event.action": "assignIsDisposedHeader", "logrite.outgoingMessage": outgoingMessage });
  }

  public assignErrorHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
	logger.error(`>>> Entering assignErrorHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`, { "event.action": "assignErrorHeader", "logrite.outgoingMessage": outgoingMessage });
    if (!outgoingResponse.err) {
      return;
    }
    const stringifiedError =
      typeof outgoingResponse.err === 'object'
        ? JSON.stringify(outgoingResponse.err)
        : outgoingResponse.err;
    outgoingMessage.headers![KafkaHeaders.NEST_ERR] =
      Buffer.from(stringifiedError);
	logger.warn(`<<< Exiting assignErrorHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`, { "event.action": "assignErrorHeader", "logrite.outgoingMessage": outgoingMessage });
  }

  public assignCorrelationIdHeader(
    correlationId: string,
    outgoingMessage: Message,
  ) {
	logger.error(`>>> Entering assignCorrelationIdHeader(correlationId=${correlationId},outgoingMessage=${outgoingMessage})`, { "event.action": "assignCorrelationIdHeader", "logrite.correlationId": correlationId, "logrite.outgoingMessage": outgoingMessage });
    outgoingMessage.headers![KafkaHeaders.CORRELATION_ID] =
      Buffer.from(correlationId);
	logger.warn(`<<< Exiting assignCorrelationIdHeader(correlationId=${correlationId},outgoingMessage=${outgoingMessage})`, { "event.action": "assignCorrelationIdHeader", "logrite.correlationId": correlationId, "logrite.outgoingMessage": outgoingMessage });
  }

  public assignReplyPartition(
    replyPartition: string | null | undefined,
    outgoingMessage: Message,
  ) {
	logger.error(`>>> Entering assignReplyPartition(replyPartition=${replyPartition},outgoingMessage=${outgoingMessage})`, { "event.action": "assignReplyPartition", "logrite.replyPartition": replyPartition, "logrite.outgoingMessage": outgoingMessage });
    if (isNil(replyPartition)) {
      return;
    }
    outgoingMessage.partition = parseFloat(replyPartition);
	logger.warn(`<<< Exiting assignReplyPartition(replyPartition=${replyPartition},outgoingMessage=${outgoingMessage})`, { "event.action": "assignReplyPartition", "logrite.replyPartition": replyPartition, "logrite.outgoingMessage": outgoingMessage });
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: KafkaContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }

    return this.onProcessingStartHook(this.transportId, context, async () => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        await lastValueFrom(resultOrStream);
        this.onProcessingEndHook?.(this.transportId, context);
      }
    });
	logger.warn(`<<< Exiting handleEvent(pattern=${pattern},packet=${packet},context=${context})`, { "event.action": "handleEvent", "logrite.pattern": pattern, "logrite.packet": packet });
  }

  protected initializeSerializer(options: KafkaOptions['options']) {
	logger.error(`>>> Entering initializeSerializer(options=${options})`, { "event.action": "initializeSerializer", "logrite.options": options });
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer();
	logger.warn(`<<< Exiting initializeSerializer(options=${options})`, { "event.action": "initializeSerializer", "logrite.options": options });
  }

  protected initializeDeserializer(options: KafkaOptions['options']) {
	logger.error(`>>> Entering initializeDeserializer(options=${options})`, { "event.action": "initializeDeserializer", "logrite.options": options });
    this.deserializer = options?.deserializer ?? new KafkaRequestDeserializer();
	logger.warn(`<<< Exiting initializeDeserializer(options=${options})`, { "event.action": "initializeDeserializer", "logrite.options": options });
  }
}
