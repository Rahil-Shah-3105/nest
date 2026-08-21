import {
  throwError as _throw,
  connectable,
  defer,
  Observable,
  Subject,
} from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from '../constants.js';
import { KafkaResponseDeserializer } from '../deserializers/kafka-response.deserializer.js';
import { KafkaHeaders } from '../enums/index.js';
import { InvalidKafkaClientTopicException } from '../errors/invalid-kafka-client-topic.exception.js';
import { InvalidMessageException } from '../errors/invalid-message.exception.js';
import { KafkaStatus } from '../events/index.js';
import {
  BrokersFunction,
  Consumer,
  ConsumerConfig,
  ConsumerGroupJoinEvent,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  KafkaMessage,
  Producer,
  TopicPartitionOffsetAndMetadata,
} from '../external/kafka.interface.js';
import {
  KafkaLogger,
  KafkaParser,
  KafkaReplyPartitionAssigner,
} from '../helpers/index.js';
import {
  ClientKafkaProxy,
  KafkaOptions,
  MsPattern,
  OutgoingEvent,
  ReadPacket,
  WritePacket,
} from '../interfaces/index.js';
import {
  KafkaRequest,
  KafkaRequestSerializer,
} from '../serializers/kafka-request.serializer.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackage, isNil, isUndefined } from '@nestjs/common/internal';

/**
 * @publicApi
 */
export class ClientKafka
  extends ClientProxy<never, KafkaStatus>
  implements ClientKafkaProxy
{
  protected logger = new Logger(ClientKafka.name);
  protected client: Kafka | null = null;
  protected parser: KafkaParser | null = null;
  protected initialized: Promise<void> | null = null;
  protected responsePatterns: string[] = [];
  protected consumerAssignments: { [key: string]: number } = {};
  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;
  protected producerOnlyMode: boolean;
  protected _consumer: Consumer | null = null;
  protected _producer: Producer | null = null;

  get consumer(): Consumer {
    if (!this._consumer) {
      throw new Error(
        'No consumer initialized. Please, call the "connect" method first.',
      );
    }
    return this._consumer;
  }

  get producer(): Producer {
    if (!this._producer) {
      throw new Error(
        'No producer initialized. Please, call the "connect" method first.',
      );
    }
    return this._producer;
  }

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
    const postfixId = this.getOptionsProp(this.options, 'postfixId', '-client');
    this.producerOnlyMode = this.getOptionsProp(
      this.options,
      'producerOnlyMode',
      false,
    );

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

  public subscribeToResponseOf(pattern: unknown): void {
	logger.debug(`>>> Entering subscribeToResponseOf(pattern=${pattern})`);
    const request = this.normalizePattern(pattern as MsPattern);
	logger.debug(`subscribeToResponseOf(pattern=${pattern}): request → ${request}`);
    this.responsePatterns.push(this.getResponsePatternName(request));
	logger.debug(`<<< Exiting subscribeToResponseOf(pattern=${pattern})`);
  }

  public async close(): Promise<void> {
	logger.debug('>>> Entering close()');
    this._producer && (await this._producer.disconnect());
    this._consumer && (await this._consumer.disconnect());
    this._producer = null;
    this._consumer = null;
	logger.debug(`close(): this._producer → ${this._producer}`);
    this.initialized = null;
    this.client = null;
	logger.debug(`close(): this._consumer → ${this._consumer}`);
  }

  public async connect(): Promise<Producer> {
    if (this.initialized) {
	logger.debug('>>> Entering connect()');
      return this.initialized.then(() => this._producer!);
    }
    this.initialized = this.initializeClientAndConnections();
    return this.initialized.then(() => this._producer!);
  }

  private async initializeClientAndConnections(): Promise<void> {
    this.client = await this.createClient();
    if (!this.producerOnlyMode) {
	logger.debug('>>> Entering initializeClientAndConnections()');
      const partitionAssigners = [
        (
          config: ConstructorParameters<typeof KafkaReplyPartitionAssigner>[1],
        ) => new KafkaReplyPartitionAssigner(this, config),
      ];

      const consumerOptions = {
        partitionAssigners,
        ...(this.options.consumer || {}),
        groupId: this.groupId,
      };

      this._consumer = this.client!.consumer(consumerOptions);
      this.registerConsumerEventListeners();

      // Set member assignments on join and rebalance
      this._consumer.on(
        this._consumer.events.GROUP_JOIN,
        this.setConsumerAssignments.bind(this),
      );
      await this._consumer.connect();
      await this.bindTopics();
    }

    this._producer = this.client!.producer(this.options.producer || {});
    this.registerProducerEventListeners();
    await this._producer.connect();
	logger.debug('<<< Exiting initializeClientAndConnections()');
  }

  public async bindTopics(): Promise<void> {
    if (!this._consumer) {
	logger.debug('>>> Entering bindTopics()');
      throw Error('No consumer initialized');
    }

    const consumerSubscribeOptions = this.options.subscribe || {};

    if (this.responsePatterns.length > 0) {
	logger.debug('<<< Exiting bindTopics()');
      await this._consumer.subscribe({
        ...consumerSubscribeOptions,
        topics: this.responsePatterns,
      });
    }

    await this._consumer.run({
      ...(this.options.run || {}),
      eachMessage: this.createResponseCallback(),
    });
  }

  public async createClient<T = any>(): Promise<T> {
	logger.debug('>>> Entering createClient()');
    const kafkaPackage = await loadPackage(
      'kafkajs',
      ClientKafka.name,
      () => import('kafkajs'),
    );

    const kafkaConfig: KafkaConfig = {
      logCreator: KafkaLogger.bind(null, this.logger),
      ...this.options.client,
      brokers: this.brokers,
      clientId: this.clientId,
    };

	logger.debug('<<< Exiting createClient()');
    return new kafkaPackage.Kafka(kafkaConfig);
  }

  public createResponseCallback(): (payload: EachMessagePayload) => any {
    return async (payload: EachMessagePayload) => {
      const rawMessage = this.parser!.parse<KafkaMessage>(
        Object.assign(payload.message, {
          topic: payload.topic,
          partition: payload.partition,
        }),
      );
      if (isUndefined(rawMessage.headers![KafkaHeaders.CORRELATION_ID])) {
        return;
      }
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(rawMessage);
      const callback = this.routingMap.get(id);
	logger.debug(`createResponseCallback(): callback → ${callback}`);
      if (!callback) {
        return;
      }
      if (err || isDisposed) {
        return callback({
          err,
          response,
          isDisposed,
        });
      }
      callback({
        err,
        response,
      });
    };
  }

  public getConsumerAssignments() {
	logger.debug('>>> Entering getConsumerAssignments()');
	logger.debug('<<< Exiting getConsumerAssignments()');
    return this.consumerAssignments;
  }

  public emitBatch<TResult = any, TInput = any>(
    pattern: any,
    data: { messages: TInput[] },
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(() => new InvalidMessageException());
    }
    const source = defer(async () => this.connect()).pipe(
      mergeMap(() => this.dispatchBatchEvent({ pattern, data })),
    );
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });
    connectableSource.connect();
	logger.debug(`>>> Entering dispatchBatchEvent(packets=${packets})`);
	logger.debug(`dispatchBatchEvent(packets=${packets}): pattern → ${pattern}`);
	logger.debug(`<<< Exiting dispatchBatchEvent(packets=${packets})`);
    return connectableSource;
  }

  public commitOffsets(
    topicPartitions: TopicPartitionOffsetAndMetadata[],
  ): Promise<void> {
    if (this._consumer) {
	logger.debug(`>>> Entering commitOffsets(topicPartitions=${topicPartitions})`);
      return this._consumer.commitOffsets(topicPartitions);
    } else {
      throw new Error('No consumer initialized');
    }
  }

  public unwrap<T>(): T {
    if (!this.client) {
	logger.debug('>>> Entering unwrap()');
	logger.debug('<<< Exiting unwrap()');
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.client as T;
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
  >(event: EventKey, callback: EventCallback) {
    throw new Error('Method is not supported for Kafka client');
  }

  protected registerConsumerEventListeners() {
	logger.debug('>>> Entering registerConsumerEventListeners()');
    if (!this._consumer) {
      return;
    }
    this._consumer.on(this._consumer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this._consumer.on(this._consumer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
    this._consumer.on(this._consumer.events.REBALANCING, () =>
      this._status$.next(KafkaStatus.REBALANCING),
    );
    this._consumer.on(this._consumer.events.STOP, () =>
      this._status$.next(KafkaStatus.STOPPED),
    );
    this._consumer.on(this._consumer.events.CRASH, () =>
      this._status$.next(KafkaStatus.CRASHED),
    );
	logger.debug('<<< Exiting registerConsumerEventListeners()');
  }

  protected registerProducerEventListeners() {
	logger.debug('>>> Entering registerProducerEventListeners()');
    if (!this._producer) {
      return;
    }
    this._producer.on(this._producer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this._producer.on(this._producer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
	logger.debug('<<< Exiting registerProducerEventListeners()');
  }

  protected async dispatchBatchEvent<TInput = any>(
    packets: ReadPacket<{ messages: TInput[] }>,
  ): Promise<any> {
    if (packets.data.messages.length === 0) {
      return;
    }
    const pattern = this.normalizePattern(packets.pattern);
    const outgoingEvents = await Promise.all(
      packets.data.messages.map(message => {
        return this.serializer.serialize(message as any, { pattern });
      }),
    );

    const message = {
      topic: pattern,
      messages: outgoingEvents,
      ...(this.options.send || {}),
    };

    return this.producer.send(message);
  }

  protected async dispatchEvent(packet: OutgoingEvent): Promise<any> {
	logger.debug(`>>> Entering dispatchEvent(packet=${packet})`);
    const pattern = this.normalizePattern(packet.pattern);
    const outgoingEvent = await this.serializer.serialize(packet.data, {
      pattern,
    });
    const message = {
      topic: pattern,
      messages: [outgoingEvent],
      ...(this.options.send || {}),
    };

	logger.debug(`dispatchEvent(packet=${packet}): pattern → ${pattern}`);
	logger.debug(`<<< Exiting dispatchEvent(packet=${packet})`);
    return this._producer!.send(message);
  }

  protected getReplyTopicPartition(topic: string): string {
    const minimumPartition = this.consumerAssignments[topic];
    if (isUndefined(minimumPartition)) {
	logger.debug(`>>> Entering getReplyTopicPartition(topic=${topic})`);
	logger.debug(`<<< Exiting getReplyTopicPartition(topic=${topic})`);
      throw new InvalidKafkaClientTopicException(topic);
    }

    // Get the minimum partition
    return minimumPartition.toString();
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    const packet = this.assignPacketId(partialPacket);
    this.routingMap.set(packet.id, callback);

    const cleanup = () => this.routingMap.delete(packet.id);
    const errorCallback = (err: unknown) => {
      cleanup();
	logger.debug(`>>> Entering errorCallback(err=${err})`);
      callback({ err });
	logger.debug(`<<< Exiting errorCallback(err=${err})`);
    };

    try {
      const pattern = this.normalizePattern(partialPacket.pattern);
      const replyTopic = this.getResponsePatternName(pattern);
      const replyPartition = this.getReplyTopicPartition(replyTopic);

      Promise.resolve(this.serializer.serialize(packet.data, { pattern }))
        .then((serializedPacket: KafkaRequest) => {
          serializedPacket.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
          serializedPacket.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
          serializedPacket.headers[KafkaHeaders.REPLY_PARTITION] =
            replyPartition;

          const message = {
            topic: pattern,
            messages: [serializedPacket],
            ...(this.options.send || {}),
          };

          return this._producer!.send(message);
        })
        .catch(err => errorCallback(err));

      return cleanup;
    } catch (err) {
      errorCallback(err);
      return () => null;
    }
  }

  protected getResponsePatternName(pattern: string): string {
	logger.debug(`>>> Entering getResponsePatternName(pattern=${pattern})`);
	logger.debug(`<<< Exiting getResponsePatternName(pattern=${pattern})`);
    return `${pattern}.reply`;
  }

  protected setConsumerAssignments(data: ConsumerGroupJoinEvent): void {
    const consumerAssignments: { [key: string]: number } = {};

    // Only need to set the minimum
    for (const [topic, memberPartitions] of Object.entries(
      data.payload.memberAssignment,
    )) {
	logger.debug(`>>> Entering setConsumerAssignments(data=${data})`);
      if (memberPartitions.length) {
        consumerAssignments[topic] = Math.min(...memberPartitions);
      }
    }

    this.consumerAssignments = consumerAssignments;
	logger.debug(`setConsumerAssignments(data=${data}): this.consumerAssignments → ${this.consumerAssignments}`);
  }

  protected initializeSerializer(options: KafkaOptions['options']) {
	logger.debug(`>>> Entering initializeSerializer(options=${options})`);
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer();
	logger.debug(`<<< Exiting initializeSerializer(options=${options})`);
  }

  protected initializeDeserializer(options: KafkaOptions['options']) {
	logger.debug(`>>> Entering initializeDeserializer(options=${options})`);
    this.deserializer =
      (options && options.deserializer) || new KafkaResponseDeserializer();
	logger.debug(`<<< Exiting initializeDeserializer(options=${options})`);
  }
}
