import {
  connectable,
  EMPTY,
  from as fromPromise,
  isObservable,
  Observable,
  ObservedValueOf,
  of,
  ReplaySubject,
  Subject,
  Subscription,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  mergeMap,
} from 'rxjs/operators';
import { NO_EVENT_HANDLER } from '../constants.js';
import { BaseRpcContext } from '../ctx-host/base-rpc.context.js';
import { IncomingRequestDeserializer } from '../deserializers/incoming-request.deserializer.js';
import { Transport } from '../enums/index.js';
import { ConsumerDeserializer } from '../interfaces/deserializer.interface.js';
import {
  ClientOptions,
  KafkaOptions,
  MessageHandler,
  MicroserviceOptions,
  MqttOptions,
  MsPattern,
  NatsOptions,
  ReadPacket,
  RedisOptions,
  RmqOptions,
  TcpOptions,
  WritePacket,
} from '../interfaces/index.js';
import { ConsumerSerializer } from '../interfaces/serializer.interface.js';
import { IdentitySerializer } from '../serializers/identity.serializer.js';
import { transformPatternToRoute } from '../utils/index.js';
import { ITransportServer, Logger, type LoggerService } from '@nestjs/common';
import { loadPackage, loadPackageSync } from '@nestjs/common/internal';

/**
 * @publicApi
 */
export abstract class Server<
  EventsMap extends Record<string, Function> = Record<string, Function>,
  Status extends string = string,
> implements ITransportServer {
  /**
   * Unique transport identifier.
   */
  public transportId?: Transport | symbol;

  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger: LoggerService = new Logger(Server.name);
  protected serializer: ConsumerSerializer;
  protected deserializer: ConsumerDeserializer;
  protected onProcessingStartHook: (
    transportId: Transport | symbol,
    context: BaseRpcContext,
    done: () => Promise<any>,
  ) => void = (
    transportId: Transport | symbol,
    context: BaseRpcContext,
    done: () => Promise<any>,
  ) => done();
  protected onProcessingEndHook: (
    transportId: Transport | symbol,
    context: BaseRpcContext,
  ) => void;
  protected _status$ = new ReplaySubject<Status>(1);

  /**
   * Returns an observable that emits status changes.
   */
  public get status(): Observable<Status> {
    return this._status$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public abstract on<
    EventKey extends keyof EventsMap = keyof EventsMap,
    EventCallback extends EventsMap[EventKey] = EventsMap[EventKey],
  >(event: EventKey, callback: EventCallback): any;

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public abstract unwrap<T>(): T;

  /**
   * Method called when server is being initialized.
   * @param callback Function to be called upon initialization
   */
  public abstract listen(callback: (...optionalParams: unknown[]) => any): any;

  /**
   * Method called when server is being terminated.
   */
  public abstract close(): any;

  /**
   * Sets the transport identifier.
   * @param transportId Unique transport identifier.
   */
  public setTransportId(transportId: Transport | symbol): void {
	LoggerService.debug(`>>> Entering setTransportId(transportId=${transportId})`);
    this.transportId = transportId;
  }

  /**
   * Sets a hook that will be called when processing starts.
   */
  public setOnProcessingStartHook(
    hook: (
      transportId: Transport | symbol,
      context: unknown,
      done: () => Promise<any>,
    ) => void,
  ): void {
	LoggerService.debug(`>>> Entering setOnProcessingStartHook(hook=${hook})`);
	LoggerService.debug(`setOnProcessingStartHook(hook=${hook}): this.onProcessingStartHook → ${this.onProcessingStartHook}`);
    this.onProcessingStartHook = hook;
  }

  /**
   * Sets a hook that will be called when processing ends.
   */
  public setOnProcessingEndHook(
    hook: (transportId: Transport | symbol, context: unknown) => void,
  ): void {
	LoggerService.debug(`>>> Entering setOnProcessingEndHook(hook=${hook})`);
    this.onProcessingEndHook = hook;
	LoggerService.debug(`<<< Exiting setOnProcessingEndHook(hook=${hook})`);
  }

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {},
  ) {
	LoggerService.debug(`>>> Entering addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras})`);
    const normalizedPattern = this.normalizePattern(pattern);
    callback.isEventHandler = isEventHandler;
	LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): normalizedPattern → ${normalizedPattern}`);
	LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.isEventHandler → ${callback.isEventHandler}`);
	LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.extras → ${callback.extras}`);
    callback.extras = extras;

    if (this.messageHandlers.has(normalizedPattern) && isEventHandler) {
      const headRef = this.messageHandlers.get(normalizedPattern)!;
      const getTail = (handler: MessageHandler) =>
        handler?.next ? getTail(handler.next) : handler;
		LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): headRef → ${headRef}`);

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
	LoggerService.debug(`getTail(handler=${handler}): tailRef → ${tailRef}`);
      this.messageHandlers.set(normalizedPattern, callback);
	LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): tailRef.next → ${tailRef.next}`);
    }
  }

  public getHandlers(): Map<string, MessageHandler> {
	LoggerService.debug('>>> Entering getHandlers()');
	LoggerService.debug('<<< Exiting getHandlers()');
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
	LoggerService.debug(`>>> Entering getHandlerByPattern(pattern=${pattern})`);
    const route = this.getRouteFromPattern(pattern);
	LoggerService.debug(`getHandlerByPattern(pattern=${pattern}): route → ${route}`);
	LoggerService.debug(`<<< Exiting getHandlerByPattern(pattern=${pattern})`);
    return this.messageHandlers.has(route)
      ? this.messageHandlers.get(route)!
      : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => Promise<unknown> | void,
  ): Subscription {
    const dataQueue: WritePacket[] = [];
    let isProcessing = false;
	LoggerService.debug(`send(stream$=${stream$},respond=${respond}): isProcessing → ${isProcessing}`);
    const scheduleOnNextTick = (data: WritePacket) => {
	LoggerService.debug(`>>> Entering send(stream$=${stream$},respond=${respond})`);
      if (data.isDisposed && dataQueue.length > 0) {
		LoggerService.debug(`>>> Entering scheduleOnNextTick(data=${data})`);
		LoggerService.debug(`<<< Exiting scheduleOnNextTick(data=${data})`);
        dataQueue[dataQueue.length - 1].isDisposed = true;
      } else {
        dataQueue.push(data);
      }
      if (!isProcessing) {
        isProcessing = true;
        process.nextTick(async () => {
          while (dataQueue.length > 0) {
            const packet = dataQueue.shift();
            if (packet) {
              await respond(packet);
            }
          }
          isProcessing = false;
        });
      }
    };
    return stream$
      .pipe(
        catchError((err: any) => {
          scheduleOnNextTick({ err });
		LoggerService.debug(`<<< Exiting send(stream$=${stream$},respond=${respond})`);
          return EMPTY;
        }),
        finalize(() => scheduleOnNextTick({ isDisposed: true })),
      )
      .subscribe((response: any) => scheduleOnNextTick({ response }));
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: BaseRpcContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }
    return this.onProcessingStartHook(this.transportId!, context, async () => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        const connectableSource = connectable(
          resultOrStream.pipe(
            finalize(() =>
              this.onProcessingEndHook?.(this.transportId!, context),
            ),
          ),
          {
            connector: () => new Subject(),
            resetOnDisconnect: false,
          },
        );
        connectableSource.connect();
      } else {
        this.onProcessingEndHook?.(this.transportId!, context);
      }
    });
	LoggerService.debug(`<<< Exiting handleEvent(pattern=${pattern},packet=${packet},context=${context})`);
  }

  public transformToObservable<T>(
    resultOrDeferred: Observable<T> | Promise<T>,
  ): Observable<T>;
  public transformToObservable<T>(
    resultOrDeferred: T,
  ): never extends Observable<ObservedValueOf<T>>
    ? Observable<T>
    : Observable<ObservedValueOf<T>>;
  public transformToObservable(resultOrDeferred: any) {
	LoggerService.debug(`>>> Entering transformToObservable(resultOrDeferred=${resultOrDeferred})`);
    if (resultOrDeferred instanceof Promise) {
      return fromPromise(resultOrDeferred).pipe(
        mergeMap(val => (isObservable(val) ? val : of(val))),
      );
    }

    if (isObservable(resultOrDeferred)) {
	LoggerService.debug(`<<< Exiting transformToObservable(resultOrDeferred=${resultOrDeferred})`);
      return resultOrDeferred;
    }

    return of(resultOrDeferred);
  }

  public getOptionsProp<
    Options extends MicroserviceOptions['options'],
    Attribute extends keyof Options,
  >(obj: Options, prop: Attribute): Options[Attribute];
  public getOptionsProp<
    Options extends MicroserviceOptions['options'],
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute],
  >(
    obj: Options,
    prop: Attribute,
    defaultValue: DefaultValue,
  ): Required<Options>[Attribute];
  public getOptionsProp<
    Options extends MicroserviceOptions['options'],
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute],
  >(
    obj: Options,
    prop: Attribute,
    defaultValue: DefaultValue = undefined as DefaultValue,
  ) {
	LoggerService.debug(`>>> Entering getOptionsProp(obj=${obj},prop=${prop},defaultValue=${defaultValue})`);
	LoggerService.debug(`<<< Exiting getOptionsProp(obj=${obj},prop=${prop},defaultValue=${defaultValue})`);
    return obj && prop in obj ? (obj as any)[prop] : defaultValue;
  }

  protected handleError(error: string) {
	LoggerService.debug(`>>> Entering handleError(error=${error})`);
    this.logger.error(error);
	LoggerService.debug(`<<< Exiting handleError(error=${error})`);
  }

  protected loadPackage<T = any>(
    name: string,
    ctx: string,
    loader?: () => T,
  ): T | Promise<T> {
	LoggerService.debug(`>>> Entering loadPackage(name=${name},ctx=${ctx},loader=${loader})`);
	LoggerService.debug(`<<< Exiting loadPackage(name=${name},ctx=${ctx},loader=${loader})`);
    return loadPackage(name, ctx, loader);
  }

  protected loadPackageSynchronously<T = any>(
    name: string,
    ctx: string,
    loader?: () => T,
  ): T {
	LoggerService.debug(`>>> Entering loadPackageSynchronously(name=${name},ctx=${ctx},loader=${loader})`);
	LoggerService.debug(`<<< Exiting loadPackageSynchronously(name=${name},ctx=${ctx},loader=${loader})`);
    return loadPackageSync(name, ctx, loader);
  }

  protected initializeSerializer(options: ClientOptions['options']) {
	LoggerService.debug(`>>> Entering initializeSerializer(options=${options})`);
    this.serializer =
      (options &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options'])!.serializer) ||
      new IdentitySerializer();
	LoggerService.debug(`<<< Exiting initializeSerializer(options=${options})`);
  }

  protected initializeDeserializer(options: ClientOptions['options']) {
	LoggerService.debug(`>>> Entering initializeDeserializer(options=${options})`);
    this.deserializer =
      (options! &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options'])!.deserializer) ||
      new IncomingRequestDeserializer();
	LoggerService.debug(`<<< Exiting initializeDeserializer(options=${options})`);
  }

  /**
   * Transforms the server Pattern to valid type and returns a route for him.
   *
   * @param  {string} pattern - server pattern
   * @returns string
   */
  protected getRouteFromPattern(pattern: string): string {
    let validPattern: MsPattern;

    try {
      validPattern = JSON.parse(pattern);
    } catch (error) {
	LoggerService.debug(`>>> Entering getRouteFromPattern(pattern=${pattern})`);
      // Uses a fundamental object (`pattern` variable without any conversion)
	LoggerService.error(`Exception in getRouteFromPattern(pattern=${pattern}): ${(error as Error).message}`, error);
      validPattern = pattern;
    }
	LoggerService.debug(`<<< Exiting getRouteFromPattern(pattern=${pattern})`);
    return this.normalizePattern(validPattern);
  }

  protected normalizePattern(pattern: MsPattern): string {
	LoggerService.debug(`>>> Entering normalizePattern(pattern=${pattern})`);
	LoggerService.debug(`<<< Exiting normalizePattern(pattern=${pattern})`);
    return transformPatternToRoute(pattern);
  }
}
