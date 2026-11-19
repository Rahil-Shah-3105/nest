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
	LoggerService.error(`>>> Entering setTransportId(transportId=${String(transportId)})`, { "event.action": "setTransportId", "logrite.transportId": transportId });
    this.transportId = transportId;
	LoggerService.debug(`setTransportId(transportId=${String(transportId)}): this.transportId → ${this.transportId}`, { "event.action": "setTransportId", "logrite.transportId": transportId });
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
	LoggerService.error(`>>> Entering setOnProcessingStartHook(hook=${String(hook)})`, { "event.action": "setOnProcessingStartHook", "logrite.hook": hook });
    this.onProcessingStartHook = hook;
	LoggerService.warn(`<<< Exiting setOnProcessingStartHook(hook=${String(hook)})`, { "event.action": "setOnProcessingStartHook", "logrite.hook": hook });
  }

  /**
   * Sets a hook that will be called when processing ends.
   */
  public setOnProcessingEndHook(
    hook: (transportId: Transport | symbol, context: unknown) => void,
  ): void {
	LoggerService.error(`>>> Entering setOnProcessingEndHook(hook=${hook})`, { "event.action": "setOnProcessingEndHook", "logrite.hook": hook });
    this.onProcessingEndHook = hook;
	LoggerService.warn(`<<< Exiting setOnProcessingEndHook(hook=${hook})`, { "event.action": "setOnProcessingEndHook", "logrite.hook": hook });
  }

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {},
  ) {
	LoggerService.error(`>>> Entering addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras})`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
    const normalizedPattern = this.normalizePattern(pattern);
    callback.isEventHandler = isEventHandler;
	LoggerService.error(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): normalizedPattern → ${normalizedPattern}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
	LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.isEventHandler → ${callback.isEventHandler}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
    callback.extras = extras;

	LoggerService.debug(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): callback.extras → ${callback.extras}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });
    if (this.messageHandlers.has(normalizedPattern) && isEventHandler) {
      const headRef = this.messageHandlers.get(normalizedPattern)!;
      const getTail = (handler: MessageHandler) =>
        handler?.next ? getTail(handler.next) : handler;
		LoggerService.error(`addHandler(pattern=${pattern},callback=${callback},isEventHandler=${isEventHandler},extras=${extras}): headRef → ${headRef}`, { "event.action": "addHandler", "logrite.pattern": pattern, "logrite.callback": callback, "logrite.isEventHandler": isEventHandler, "logrite.extras": extras });

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
	LoggerService.error(`getTail(handler=${handler}): tailRef → ${tailRef}`, { "event.action": "getTail", "logrite.handler": handler });
	LoggerService.debug(`getTail(handler=${handler}): tailRef.next → ${tailRef.next}`, { "event.action": "getTail", "logrite.handler": handler });
      this.messageHandlers.set(normalizedPattern, callback);
    }
  }

  public getHandlers(): Map<string, MessageHandler> {
	LoggerService.error('>>> Entering getHandlers()', { "event.action": "getHandlers" });
	LoggerService.warn('<<< Exiting getHandlers()', { "event.action": "getHandlers" });
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
	LoggerService.error(`>>> Entering getHandlerByPattern(pattern=${pattern})`, { "event.action": "getHandlerByPattern", "logrite.pattern": pattern });
    const route = this.getRouteFromPattern(pattern);
	LoggerService.warn(`<<< Exiting getHandlerByPattern(pattern=${pattern})`, { "event.action": "getHandlerByPattern", "logrite.pattern": pattern });
    return this.messageHandlers.has(route)
      ? this.messageHandlers.get(route)!
      : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => Promise<unknown> | void,
  ): Subscription {
	LoggerService.error(`>>> Entering send(stream$=${stream$},respond=${respond})`, { "event.action": "send", "logrite.stream$": stream$, "logrite.respond": respond });
    const dataQueue: WritePacket[] = [];
    let isProcessing = false;
	LoggerService.error(`send(stream$=${stream$},respond=${respond}): isProcessing → ${isProcessing}`, { "event.action": "send", "logrite.stream$": stream$, "logrite.respond": respond });
    const scheduleOnNextTick = (data: WritePacket) => {
	LoggerService.error(`>>> Entering scheduleOnNextTick(data=${data})`, { "event.action": "scheduleOnNextTick" });
      if (data.isDisposed && dataQueue.length > 0) {
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
		LoggerService.warn(`<<< Exiting scheduleOnNextTick(data=${data})`, { "event.action": "scheduleOnNextTick" });
      }
    };
    return stream$
      .pipe(
        catchError((err: any) => {
          scheduleOnNextTick({ err });
		LoggerService.warn(`<<< Exiting send(stream$=${stream$},respond=${respond})`, { "event.action": "send", "logrite.stream$": stream$, "logrite.respond": respond });
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
	LoggerService.warn(`<<< Exiting handleEvent(pattern=${pattern},packet=${packet},context=${context})`, { "event.action": "handleEvent", "logrite.pattern": pattern, "logrite.packet": packet });
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
	LoggerService.error(`>>> Entering transformToObservable(resultOrDeferred=${resultOrDeferred})`, { "event.action": "transformToObservable", "logrite.resultOrDeferred": resultOrDeferred });
    if (resultOrDeferred instanceof Promise) {
      return fromPromise(resultOrDeferred).pipe(
        mergeMap(val => (isObservable(val) ? val : of(val))),
      );
    }

    if (isObservable(resultOrDeferred)) {
      return resultOrDeferred;
    }

	LoggerService.warn(`<<< Exiting transformToObservable(resultOrDeferred=${resultOrDeferred})`, { "event.action": "transformToObservable", "logrite.resultOrDeferred": resultOrDeferred });
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
	LoggerService.error(`>>> Entering getOptionsProp(obj=${obj},prop=${prop},defaultValue=${defaultValue})`, { "event.action": "getOptionsProp", "logrite.obj": obj, "logrite.prop": prop, "logrite.defaultValue": defaultValue });
	LoggerService.warn(`<<< Exiting getOptionsProp(obj=${obj},prop=${prop},defaultValue=${defaultValue})`, { "event.action": "getOptionsProp", "logrite.obj": obj, "logrite.prop": prop, "logrite.defaultValue": defaultValue });
    return obj && prop in obj ? (obj as any)[prop] : defaultValue;
  }

  protected handleError(error: string) {
	LoggerService.error(`>>> Entering handleError(error=${error})`, { "event.action": "handleError", "logrite.error": error });
    this.logger.error(error);
	LoggerService.warn(`<<< Exiting handleError(error=${error})`, { "event.action": "handleError", "logrite.error": error });
  }

  protected loadPackage<T = any>(
    name: string,
    ctx: string,
    loader?: () => T,
  ): T | Promise<T> {
	LoggerService.error(`>>> Entering loadPackage(name=${name},ctx=${ctx},loader=${loader})`, { "event.action": "loadPackage", "logrite.name": name, "logrite.loader": loader });
	LoggerService.warn(`<<< Exiting loadPackage(name=${name},ctx=${ctx},loader=${loader})`, { "event.action": "loadPackage", "logrite.name": name, "logrite.loader": loader });
    return loadPackage(name, ctx, loader);
  }

  protected loadPackageSynchronously<T = any>(
    name: string,
    ctx: string,
    loader?: () => T,
  ): T {
	LoggerService.error(`>>> Entering loadPackageSynchronously(name=${name},ctx=${ctx},loader=${loader})`, { "event.action": "loadPackageSynchronously", "logrite.name": name, "logrite.loader": loader });
	LoggerService.warn(`<<< Exiting loadPackageSynchronously(name=${name},ctx=${ctx},loader=${loader})`, { "event.action": "loadPackageSynchronously", "logrite.name": name, "logrite.loader": loader });
    return loadPackageSync(name, ctx, loader);
  }

  protected initializeSerializer(options: ClientOptions['options']) {
	LoggerService.error(`>>> Entering initializeSerializer(options=${options})`, { "event.action": "initializeSerializer", "logrite.options": options });
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
	LoggerService.warn(`<<< Exiting initializeSerializer(options=${options})`, { "event.action": "initializeSerializer", "logrite.options": options });
  }

  protected initializeDeserializer(options: ClientOptions['options']) {
	LoggerService.error(`>>> Entering initializeDeserializer(options=${options})`, { "event.action": "initializeDeserializer", "logrite.options": options });
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
	LoggerService.warn(`<<< Exiting initializeDeserializer(options=${options})`, { "event.action": "initializeDeserializer", "logrite.options": options });
  }

  /**
   * Transforms the server Pattern to valid type and returns a route for him.
   *
   * @param  {string} pattern - server pattern
   * @returns string
   */
  protected getRouteFromPattern(pattern: string): string {
	LoggerService.error(`>>> Entering getRouteFromPattern(pattern=${pattern})`, { "event.action": "getRouteFromPattern", "logrite.pattern": pattern });
    let validPattern: MsPattern;

    try {
      validPattern = JSON.parse(pattern);
    } catch (error) {
	LoggerService.error(`Exception in getRouteFromPattern(pattern=${pattern}): ${(error as Error).message}`, error, { "event.action": "getRouteFromPattern", "event.category": "process", "logrite.pattern": pattern });
      // Uses a fundamental object (`pattern` variable without any conversion)
      validPattern = pattern;
    }
	LoggerService.warn(`<<< Exiting getRouteFromPattern(pattern=${pattern})`, { "event.action": "getRouteFromPattern", "logrite.pattern": pattern });
    return this.normalizePattern(validPattern);
  }

  protected normalizePattern(pattern: MsPattern): string {
	LoggerService.error(`>>> Entering normalizePattern(pattern=${pattern})`, { "event.action": "normalizePattern", "logrite.pattern": pattern });
	LoggerService.warn(`<<< Exiting normalizePattern(pattern=${pattern})`, { "event.action": "normalizePattern", "logrite.pattern": pattern });
    return transformPatternToRoute(pattern);
  }
}
