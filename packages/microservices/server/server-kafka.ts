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
	logger.debug('>>> Entering constructor()');

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
	logger.debug(`constructor(): postfixId → ${postfixId}`);

    this.brokers = clientOptions.brokers || [KAFKA_DEFAULT_BROKER];

	logger.debug(`constructor(): this.brokers → ${this.brokers}`);
    // Append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    this.clientId =
      (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + postfixId;

    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
	logger.debug('<<< Exiting constructor()');
  }

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {},
  ) {
	logger.debug(`>>> Entering addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras})`);
    if (!(pattern instanceof RegExp)) {
	logger.debug(`<<< Exiting addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras})`);
      return super.addHandler(pattern, callback, isEventHandler, extras);
    }

    const messageHandlers = this.messageHandlers as Map<
      string | RegExp,
      MessageHandler
    >;
    callback.isEventHandler = isEventHandler;
	logger.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.isEventHandler → ${callback.isEventHandler}`);
    callback.extras = extras;
	logger.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.extras → ${callback.extras}`);

    if (messageHandlers.has(pattern) && isEventHandler) {
      const headRef = messageHandlers.get(pattern)!;
      const getTail = (handler: MessageHandler) =>
        handler?.next ? getTail(handler.next) : handler;
		logger.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): headRef → ${headRef}`);

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
	logger.debug(`getTail(handler=${handler}): tailRef → ${tailRef}`);
      messageHandlers.set(pattern, callback);
	logger.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): tailRef.next → ${tailRef.next}`);
    }
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ): Promise<void> {
    try {
      this.client = await this.createClient();
      await this.start(callback);
    } catch (err) {
	logger.debug(`>>> Entering listen(callback=${callback})`);
      callback(err);
	logger.debug(`<<< Exiting listen(callback=${callback})`);
    }
  }

  public async close(): Promise<void> {
	logger.debug('>>> Entering close()');
    this.consumer && (await this.consumer.disconnect());
    this.producer && (await this.producer.disconnect());
    this.consumer = null;
    this.producer = null;
	logger.debug(`close(): this.consumer → ${this.consumer}`);
	logger.debug(`close(): this.producer → ${this.producer}`);
    this.client = null;
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
	logger.debug('>>> Entering registerConsumerEventListeners()');
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
	logger.debug('<<< Exiting registerConsumerEventListeners()');
  }

  protected registerProducerEventListeners() {
	logger.debug('>>> Entering registerProducerEventListeners()');
    if (!this.producer) {
      return;
    }
    this.producer.on(this.producer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this.producer.on(this.producer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
	logger.debug('<<< Exiting registerProducerEventListeners()');
  }

  public async createClient<T = any>(): Promise<T> {
	logger.debug('>>> Entering createClient()');
    const kafkaPackage = await this.loadPackage(
      'kafkajs',
      ServerKafka.name,
      () => import('kafkajs'),
    );
	logger.debug('<<< Exiting createClient()');
    return new kafkaPackage.Kafka({
      logCreator: KafkaLogger.bind(null, this.logger),
      ...this.options.client,
      clientId: this.clientId,
      brokers: this.brokers,
    } as KafkaConfig) as T;
  }

  public async bindEvents(consumer: Consumer) {
	logger.debug(`>>> Entering bindEvents(consumer=${consumer})`);
    const registeredPatterns = [...this.messageHandlers.keys()];
    const consumerSubscribeOptions = this.options.subscribe || {};
	logger.debug(`bindEvents(consumer=${consumer}): registeredPatterns → ${registeredPatterns}`);

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
	logger.debug(`<<< Exiting bindEvents(consumer=${consumer})`);
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    const handler = super.getHandlerByPattern(pattern);
	logger.debug(`getHandlerByPattern(pattern=${pattern}): handler → ${handler}`);
    if (handler) {
	logger.debug(`>>> Entering getHandlerByPattern(pattern=${pattern})`);
      return handler;
    }

    const route = this.getRouteFromPattern(pattern);
	logger.debug(`getHandlerByPattern(pattern=${pattern}): route → ${route}`);
    const messageHandlers = this.messageHandlers as Map<
      string | RegExp,
      MessageHandler
    >;
    for (const [registeredPattern, registeredHandler] of messageHandlers) {
      if (
        registeredPattern instanceof RegExp &&
        this.isPatternMatch(registeredPattern, route)
      ) {
		logger.debug(`>>> Entering isPatternMatch(pattern=${pattern},route=${route})`);
		logger.debug(`isPatternMatch(pattern=${pattern},route=${route}): pattern.lastIndex → ${pattern.lastIndex}`);
		logger.debug(`<<< Exiting isPatternMatch(pattern=${pattern},route=${route})`);
        return registeredHandler;
      }
    }

	logger.debug(`<<< Exiting getHandlerByPattern(pattern=${pattern})`);
    return null;
  }

  private isPatternMatch(pattern: RegExp, route: string): boolean {
    pattern.lastIndex = 0;
    const isMatch = pattern.test(route);
    pattern.lastIndex = 0;
    return isMatch;
  }

  public getMessageHandler() {
	logger.debug('>>> Entering getMessageHandler()');
	logger.debug('<<< Exiting getMessageHandler()');
    return async (payload: EachMessagePayload) => this.handleMessage(payload);
  }

  public getPublisher(
    replyTopic: string,
    replyPartition: string,
    correlationId: string,
    context: KafkaContext,
  ): (data: any) => Promise<RecordMetadata[]> {
	logger.debug(`<<< Exiting getPublisher(replyTopic=${replyTopic},replyPartition=${replyPartition},correlationId=${correlationId},context=${context})`);
    return (data: any) =>
      this.sendMessage(
        data,
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );
  }

  public async handleMessage(payload: EachMessagePayload) {
	logger.debug(`>>> Entering handleMessage(payload=${payload})`);
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
	logger.debug(`handleMessage(payload=${payload}): packet → ${packet}`);
    const kafkaContext = new KafkaContext([
      rawMessage,
      payload.partition,
      payload.topic,
      this.consumer!,
      payload.heartbeat,
      this.producer!,
    ]);
    const handler = this.getHandlerByPattern(packet.pattern);
	logger.debug(`handleMessage(payload=${payload}): kafkaContext → ${kafkaContext}`);
    // if the correlation id or reply topic is not set
    // then this is an event (events could still have correlation id)
    if (handler?.isEventHandler || !correlationId || !replyTopic) {
	logger.debug(`handleMessage(payload=${payload}): handler → ${handler}`);
      return this.handleEvent(packet.pattern, packet, kafkaContext);
    }

    const publish = this.getPublisher(
      replyTopic,
      replyPartition,
      correlationId,
      kafkaContext,
    );

    if (!handler) {
	logger.debug(`<<< Exiting handleMessage(payload=${payload})`);
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER,
      });
    }
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
    if (!this.client) {
	logger.debug('>>> Entering unwrap()');
	logger.debug('<<< Exiting unwrap()');
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return [this.client, this.consumer, this.producer] as T;
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
  >(event: EventKey, callback: EventCallback) {
	logger.debug(`>>> Entering on(event=${event},callback=${callback})`);
	logger.debug(`<<< Exiting on(event=${event},callback=${callback})`);
    throw new Error('Method is not supported for Kafka server');
  }

  private combineStreamsAndThrowIfRetriable(
    response$: Observable<any>,
    replayStream$: ReplaySubject<unknown>,
  ) {
	logger.debug(`>>> Entering combineStreamsAndThrowIfRetriable(response$=${response$},replayStream$=${replayStream$})`);
	logger.debug(`<<< Exiting combineStreamsAndThrowIfRetriable(response$=${response$},replayStream$=${replayStream$})`);
    return new Promise<void>((resolve, reject) => {
      let isPromiseResolved = false;
      response$.subscribe({
        next: val => {
          replayStream$.next(val);
          if (!isPromiseResolved) {
            isPromiseResolved = true;
			logger.debug(`combineStreamsAndThrowIfRetriable(response$=${response$},replayStream$=${replayStream$}): isPromiseResolved → ${isPromiseResolved}`);
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
	logger.debug(`>>> Entering assignIsDisposedHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`);
    if (!outgoingResponse.isDisposed) {
      return;
    }
    outgoingMessage.headers![KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
	logger.debug(`<<< Exiting assignIsDisposedHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`);
  }

  public assignErrorHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
	logger.debug(`>>> Entering assignErrorHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`);
    if (!outgoingResponse.err) {
      return;
    }
    const stringifiedError =
      typeof outgoingResponse.err === 'object'
        ? JSON.stringify(outgoingResponse.err)
        : outgoingResponse.err;
    outgoingMessage.headers![KafkaHeaders.NEST_ERR] =
      Buffer.from(stringifiedError);
	logger.debug(`<<< Exiting assignErrorHeader(outgoingResponse=${outgoingResponse},outgoingMessage=${outgoingMessage})`);
  }

  public assignCorrelationIdHeader(
    correlationId: string,
    outgoingMessage: Message,
  ) {
	logger.debug(`>>> Entering assignCorrelationIdHeader(correlationId=${correlationId},outgoingMessage=${outgoingMessage})`);
    outgoingMessage.headers![KafkaHeaders.CORRELATION_ID] =
      Buffer.from(correlationId);
	logger.debug(`<<< Exiting assignCorrelationIdHeader(correlationId=${correlationId},outgoingMessage=${outgoingMessage})`);
  }

  public assignReplyPartition(
    replyPartition: string | null | undefined,
    outgoingMessage: Message,
  ) {
	logger.debug(`>>> Entering assignReplyPartition(replyPartition=${replyPartition},outgoingMessage=${outgoingMessage})`);
    if (isNil(replyPartition)) {
      return;
    }
    outgoingMessage.partition = parseFloat(replyPartition);
	logger.debug(`<<< Exiting assignReplyPartition(replyPartition=${replyPartition},outgoingMessage=${outgoingMessage})`);
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
	logger.debug(`<<< Exiting handleEvent(pattern=${pattern},packet=${packet},context=${context})`);
  }

  protected initializeSerializer(options: KafkaOptions['options']) {
	logger.debug(`>>> Entering initializeSerializer(options=${options})`);
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer();
	logger.debug(`<<< Exiting initializeSerializer(options=${options})`);
  }

  protected initializeDeserializer(options: KafkaOptions['options']) {
	logger.debug(`>>> Entering initializeDeserializer(options=${options})`);
    this.deserializer = options?.deserializer ?? new KafkaRequestDeserializer();
	logger.debug(`<<< Exiting initializeDeserializer(options=${options})`);
  }
}
