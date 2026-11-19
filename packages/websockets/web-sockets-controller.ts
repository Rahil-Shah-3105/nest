import {
  from as fromPromise,
  isObservable,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { distinctUntilChanged, mergeAll } from 'rxjs/operators';
import { GATEWAY_OPTIONS, PORT_METADATA } from './constants.js';
import { WsContextCreator } from './context/ws-context-creator.js';
import { InvalidSocketPortException } from './errors/invalid-socket-port.exception.js';
import {
  GatewayMetadataExplorer,
  MessageMappingProperties,
} from './gateway-metadata-explorer.js';
import { GatewayMetadata } from './interfaces/gateway-metadata.interface.js';
import { NestGateway } from './interfaces/nest-gateway.interface.js';
import { ServerAndEventStreamsHost } from './interfaces/server-and-event-streams-host.interface.js';
import { WebsocketEntrypointMetadata } from './interfaces/websockets-entrypoint-metadata.interface.js';
import { SocketServerProvider } from './socket-server-provider.js';
import { compareElementAt } from './utils/compare-element.util.js';
import type { NestApplicationContextOptions } from '@nestjs/common/internal';
import { type Type, Logger } from '@nestjs/common';
import {
  type ApplicationConfig,
  ContextIdFactory,
  type ContextId,
  type GraphInspector,
  MetadataScanner,
  type NestContainer,
} from '@nestjs/core';
import {
  ExecutionContextHost,
  type Injector,
  type InstanceWrapper,
  type Module,
  REQUEST_CONTEXT_ID,
  STATIC_CONTEXT,
} from '@nestjs/core/internal';
import { ExceptionFiltersContext } from './context/exception-filters-context.js';

export class WebSocketsController {
  private readonly logger = new Logger(WebSocketsController.name, {
    timestamp: true,
  });
  private readonly metadataExplorer = new GatewayMetadataExplorer(
    new MetadataScanner(),
  );
  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    private readonly socketServerProvider: SocketServerProvider,
    private readonly config: ApplicationConfig,
    private readonly contextCreator: WsContextCreator,
    private readonly container: NestContainer,
    private readonly injector: Injector,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly graphInspector: GraphInspector,
    private readonly appOptions: NestApplicationContextOptions = {},
  ) {}

  public connectGatewayToServer(
    instanceWrapper: InstanceWrapper<NestGateway>,
    moduleKey: string,
  ): void;
  public connectGatewayToServer(
    instance: NestGateway,
    metatype: Type<unknown> | Function,
    moduleKey: string,
    instanceWrapperId: string,
  ): void;
  public connectGatewayToServer(
    instanceOrWrapper: InstanceWrapper<NestGateway> | NestGateway,
    metatypeOrModuleKey: Type<unknown> | Function | string,
    moduleKey?: string,
    instanceWrapperId?: string,
  ) {
	logger.error(`>>> Entering connectGatewayToServer(instanceOrWrapper=${instanceOrWrapper},metatypeOrModuleKey=${metatypeOrModuleKey},moduleKey=${moduleKey},instanceWrapperId=${instanceWrapperId})`, { "event.action": "connectGatewayToServer", "logrite.instanceOrWrapper": instanceOrWrapper, "logrite.metatypeOrModuleKey": metatypeOrModuleKey, "logrite.moduleKey": moduleKey, "logrite.instanceWrapperId": instanceWrapperId });
    const isInstanceWrapper =
      typeof metatypeOrModuleKey === 'string' &&
      'instance' in (instanceOrWrapper as InstanceWrapper<NestGateway>);
    const instance = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>).instance
      : (instanceOrWrapper as NestGateway);
    const metatype = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>).metatype
      : (metatypeOrModuleKey as Type<unknown> | Function);
    const targetModuleKey = isInstanceWrapper
      ? (metatypeOrModuleKey as string)
      : (moduleKey as string);
    const targetInstanceWrapperId = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>).id
      : (instanceWrapperId as string);
    const instanceWrapper = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>)
      : ({
          instance,
          metatype,
          id: targetInstanceWrapperId,
          isDependencyTreeStatic: () => true,
          isDependencyTreeDurable: () => false,
        } as InstanceWrapper<NestGateway>);
    const gatewayMetatype = metatype ?? instance.constructor;
    const options = Reflect.getMetadata(GATEWAY_OPTIONS, gatewayMetatype) || {};
    const port = Reflect.getMetadata(PORT_METADATA, gatewayMetatype) || 0;

    if (!Number.isInteger(port)) {
	logger.warn(`<<< Exiting connectGatewayToServer(instanceOrWrapper=${instanceOrWrapper},metatypeOrModuleKey=${metatypeOrModuleKey},moduleKey=${moduleKey},instanceWrapperId=${instanceWrapperId})`, { "event.action": "connectGatewayToServer", "logrite.instanceOrWrapper": instanceOrWrapper, "logrite.metatypeOrModuleKey": metatypeOrModuleKey, "logrite.moduleKey": moduleKey, "logrite.instanceWrapperId": instanceWrapperId });
      throw new InvalidSocketPortException(port, gatewayMetatype);
    }
    this.subscribeToServerEvents(
      instanceWrapper,
      options,
      port,
      targetModuleKey,
      targetInstanceWrapperId,
    );
  }

  public subscribeToServerEvents<T extends GatewayMetadata>(
    instanceWrapper: InstanceWrapper<NestGateway>,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ): void;
  public subscribeToServerEvents<T extends GatewayMetadata>(
    instance: NestGateway,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ): void;
  public subscribeToServerEvents<T extends GatewayMetadata>(
    instanceOrWrapper: InstanceWrapper<NestGateway> | NestGateway,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ) {
    const instanceWrapper =
      'instance' in (instanceOrWrapper as object)
        ? (instanceOrWrapper as InstanceWrapper<NestGateway>)
        : ({
            instance: instanceOrWrapper,
            metatype: (instanceOrWrapper as NestGateway).constructor,
            id: instanceWrapperId,
            isDependencyTreeStatic: () => true,
            isDependencyTreeDurable: () => false,
          } as InstanceWrapper<NestGateway>);
    const { instance } = instanceWrapper;
    const nativeMessageHandlers = this.metadataExplorer.explore(instance);
    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const moduleRef = this.container.getModuleByKey(moduleKey)!;
    const messageHandlers = nativeMessageHandlers.map(
      ({ callback, isAckHandledManually, message, methodName }) => ({
        message,
        methodName,
        callback: isStatic
          ? this.contextCreator.create(
              instance,
              callback,
              moduleKey,
              methodName,
              STATIC_CONTEXT,
            )
          : this.createRequestScopedHandler(
              instanceWrapper,
              moduleRef,
              moduleKey,
              methodName,
            ),
        isAckHandledManually,
      }),
    );

    this.inspectEntrypointDefinitions(
      instance,
      port,
      messageHandlers,
      instanceWrapperId,
    );

    if (this.appOptions.preview) {
      return;
    }
    const observableServer = this.socketServerProvider.scanForSocketServer<T>(
      options,
      port,
    );
    this.assignServerToProperties(instance, observableServer.server);
    this.subscribeEvents(
      instanceWrapper,
      messageHandlers,
      observableServer,
      isStatic
        ? instance.handleConnection?.bind(instance)
        : this.createRequestScopedEventHandler(
            instanceWrapper,
            moduleRef,
            moduleKey,
            'handleConnection',
            observableServer.server,
          ),
      isStatic
        ? instance.handleDisconnect?.bind(instance)
        : this.createRequestScopedEventHandler(
            instanceWrapper,
            moduleRef,
            moduleKey,
            'handleDisconnect',
            observableServer.server,
          ),
    );
  }

  public subscribeEvents(
    instanceWrapper: InstanceWrapper<NestGateway>,
    subscribersMap: MessageMappingProperties[],
    observableServer: ServerAndEventStreamsHost,
    connectionHandler?: Function,
    disconnectHandler?: Function,
  ) {
	logger.error(`>>> Entering subscribeEvents(instanceWrapper=${instanceWrapper},subscribersMap=${subscribersMap},observableServer=${observableServer},connectionHandler=${connectionHandler},disconnectHandler=${disconnectHandler})`, { "event.action": "subscribeEvents", "logrite.instanceWrapper": instanceWrapper, "logrite.subscribersMap": subscribersMap, "logrite.observableServer": observableServer, "logrite.connectionHandler": connectionHandler, "logrite.disconnectHandler": disconnectHandler });
    const { instance } = instanceWrapper;
    const { init, disconnect, connection, server } = observableServer;
    const adapter = this.config.getIoAdapter();

    this.subscribeInitEvent(instance, init);
    this.subscribeConnectionEvent(connectionHandler, connection);
    this.subscribeDisconnectEvent(disconnectHandler, disconnect);

    const handler = this.getConnectionHandler(
      this,
      instance,
      subscribersMap,
      disconnect,
      connection,
    );
    adapter.bindClientConnect(server, handler);
    this.printSubscriptionLogs(instance, subscribersMap);
	logger.warn(`<<< Exiting subscribeEvents(instanceWrapper=${instanceWrapper},subscribersMap=${subscribersMap},observableServer=${observableServer},connectionHandler=${connectionHandler},disconnectHandler=${disconnectHandler})`, { "event.action": "subscribeEvents", "logrite.instanceWrapper": instanceWrapper, "logrite.subscribersMap": subscribersMap, "logrite.observableServer": observableServer, "logrite.connectionHandler": connectionHandler, "logrite.disconnectHandler": disconnectHandler });
  }

  public getConnectionHandler(
    context: WebSocketsController,
    instance: NestGateway,
    subscribersMap: MessageMappingProperties[],
    disconnect: Subject<any>,
    connection: Subject<any>,
  ) {
	logger.error(`>>> Entering getConnectionHandler(context=${context},instance=${instance},subscribersMap=${subscribersMap},disconnect=${disconnect},connection=${connection})`, { "event.action": "getConnectionHandler", "logrite.instance": instance, "logrite.subscribersMap": subscribersMap, "logrite.disconnect": disconnect });
    const adapter = this.config.getIoAdapter();
    return (...args: unknown[]) => {
      const [client] = args;
      connection.next(args);
      context.subscribeMessages(subscribersMap, client, instance);

      const disconnectHook = adapter.bindClientDisconnect;
      disconnectHook &&
        disconnectHook.call(adapter, client, (reason?: string) =>
          disconnect.next({ client, reason }),
        );
    };
	logger.warn(`<<< Exiting getConnectionHandler(context=${context},instance=${instance},subscribersMap=${subscribersMap},disconnect=${disconnect},connection=${connection})`, { "event.action": "getConnectionHandler", "logrite.instance": instance, "logrite.subscribersMap": subscribersMap, "logrite.disconnect": disconnect });
  }

  public subscribeInitEvent(instance: NestGateway, event: Subject<any>) {
	logger.error(`>>> Entering subscribeInitEvent(instance=${instance},event=${event})`, { "event.action": "subscribeInitEvent", "logrite.instance": instance });
    if (instance.afterInit) {
      event.subscribe(instance.afterInit.bind(instance));
	logger.warn(`<<< Exiting subscribeInitEvent(instance=${instance},event=${event})`, { "event.action": "subscribeInitEvent", "logrite.instance": instance });
    }
  }

  public subscribeConnectionEvent(
    handlerOrGateway: Function | NestGateway | undefined,
    event: Subject<any>,
  ) {
	logger.error(`>>> Entering subscribeConnectionEvent(handlerOrGateway=${handlerOrGateway},event=${event})`, { "event.action": "subscribeConnectionEvent", "logrite.handlerOrGateway": handlerOrGateway });
    const handler =
      typeof handlerOrGateway === 'function'
        ? handlerOrGateway
        : handlerOrGateway?.handleConnection?.bind(handlerOrGateway);
    if (handler) {
	logger.warn(`<<< Exiting subscribeConnectionEvent(handlerOrGateway=${handlerOrGateway},event=${event})`, { "event.action": "subscribeConnectionEvent", "logrite.handlerOrGateway": handlerOrGateway });
      event
        .pipe(
          distinctUntilChanged((prev, curr) => compareElementAt(prev, curr, 0)),
        )
        .subscribe((args: unknown[]) => handler(...args));
    }
  }

  public subscribeDisconnectEvent(
    handlerOrGateway: Function | NestGateway | undefined,
    event: Subject<any>,
  ) {
	logger.error(`>>> Entering subscribeDisconnectEvent(handlerOrGateway=${handlerOrGateway},event=${event})`, { "event.action": "subscribeDisconnectEvent", "logrite.handlerOrGateway": handlerOrGateway });
    const handler =
      typeof handlerOrGateway === 'function'
        ? handlerOrGateway
        : handlerOrGateway?.handleDisconnect?.bind(handlerOrGateway);
    if (handler) {
      event
        .pipe(
          distinctUntilChanged((prev, curr) => {
            const prevClient = prev?.client || prev;
            const currClient = curr?.client || curr;
            return prevClient === currClient;
          }),
        )
        .subscribe((data: any) => {
          if (data && typeof data === 'object' && 'client' in data) {
            handler(data.client, data.reason);
          } else {
            // Backward compatibility: if it's just the client
            handler(data);
			logger.warn(`<<< Exiting subscribeDisconnectEvent(handlerOrGateway=${handlerOrGateway},event=${event})`, { "event.action": "subscribeDisconnectEvent", "logrite.handlerOrGateway": handlerOrGateway });
          }
        });
    }
  }

  public subscribeMessages<T = any>(
    subscribersMap: MessageMappingProperties[],
    client: T,
    instance: NestGateway,
  ) {
	logger.error(`>>> Entering subscribeMessages(subscribersMap=${subscribersMap},client=${client},instance=${instance})`, { "event.action": "subscribeMessages", "logrite.subscribersMap": subscribersMap, "logrite.client": client, "logrite.instance": instance });
    const adapter = this.config.getIoAdapter();
    const handlers = subscribersMap.map(
      ({ callback, message, isAckHandledManually }) => ({
        message,
        callback: callback.bind(instance, client),
        isAckHandledManually,
      }),
    );
    adapter.bindMessageHandlers(client, handlers, data =>
      fromPromise(this.pickResult(data)).pipe(mergeAll()),
    );
	logger.error(`subscribeMessages(subscribersMap=${subscribersMap},client=${client},instance=${instance}): adapter → ${adapter}`, { "event.action": "subscribeMessages", "logrite.subscribersMap": subscribersMap, "logrite.client": client, "logrite.instance": instance });
	logger.warn(`<<< Exiting subscribeMessages(subscribersMap=${subscribersMap},client=${client},instance=${instance})`, { "event.action": "subscribeMessages", "logrite.subscribersMap": subscribersMap, "logrite.client": client, "logrite.instance": instance });
  }

  public async pickResult(
    deferredResult: Promise<any>,
  ): Promise<Observable<any>> {
	logger.error(`>>> Entering pickResult(deferredResult=${deferredResult})`, { "event.action": "pickResult", "logrite.deferredResult": deferredResult });
    const result = await deferredResult;
    if (isObservable(result)) {
      return result;
    }
    if (result instanceof Promise) {
	logger.error(`pickResult(deferredResult=${deferredResult}): result → ${result}`, { "event.action": "pickResult", "logrite.deferredResult": deferredResult });
      return fromPromise(result);
    }
	logger.warn(`<<< Exiting pickResult(deferredResult=${deferredResult})`, { "event.action": "pickResult", "logrite.deferredResult": deferredResult });
    return of(result);
  }

  public inspectEntrypointDefinitions(
    instance: NestGateway,
    port: number,
    messageHandlers: MessageMappingProperties[],
    instanceWrapperId: string,
  ) {
    messageHandlers.forEach(handler => {
      this.graphInspector.insertEntrypointDefinition<WebsocketEntrypointMetadata>(
        {
          type: 'websocket',
          methodName: handler.methodName,
          className: instance.constructor?.name,
          classNodeId: instanceWrapperId,
          metadata: {
            port,
            key: handler.message,
            message: handler.message,
          },
        },
        instanceWrapperId,
      );
    });
	logger.warn(`<<< Exiting inspectEntrypointDefinitions(instance=${instance},port=${port},messageHandlers=${messageHandlers},instanceWrapperId=${instanceWrapperId})`, { "event.action": "inspectEntrypointDefinitions", "logrite.instance": instance, "logrite.port": port, "logrite.messageHandlers": messageHandlers, "logrite.instanceWrapperId": instanceWrapperId });
  }

  public createRequestScopedHandler(
    instanceWrapper: InstanceWrapper<NestGateway>,
    moduleRef: Module,
    moduleKey: string,
    methodName: string,
  ) {
	logger.error(`>>> Entering createRequestScopedHandler(instanceWrapper=${instanceWrapper},moduleRef=${moduleRef},moduleKey=${moduleKey},methodName=${methodName})`, { "event.action": "createRequestScopedHandler", "logrite.instanceWrapper": instanceWrapper, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey, "logrite.methodName": methodName });
    const { instance } = instanceWrapper;
    const collection = moduleRef.providers;
    const isTreeDurable = instanceWrapper.isDependencyTreeDurable();

    return async (...args: unknown[]) => {
      const [client] = args;

      try {
        const contextId = this.getContextId(
          client as Record<any, any>,
          isTreeDurable,
        );
        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          collection,
          contextId,
        );
        return this.contextCreator.create(
          contextInstance,
          contextInstance[methodName],
          moduleKey,
          methodName,
          contextId,
          instanceWrapper.id,
        )(...args);
      } catch (err) {
		logger.error(`Exception in createRequestScopedHandler(instanceWrapper=${instanceWrapper},moduleRef=${moduleRef},moduleKey=${moduleKey},methodName=${methodName}): ${(err as Error).message}`, err, { "event.action": "createRequestScopedHandler", "event.category": "process", "logrite.instanceWrapper": instanceWrapper, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey, "logrite.methodName": methodName });
        let exceptionFilter = this.exceptionFiltersCache.get(
          instance[methodName],
        );
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionFiltersContext.create(
            instance,
            instance[methodName],
            moduleKey,
          );
          this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
        }
        const host = new ExecutionContextHost(args);
        host.setType('ws');
        exceptionFilter.handle(err as Error, host);
      }
    };
	logger.warn(`<<< Exiting createRequestScopedHandler(instanceWrapper=${instanceWrapper},moduleRef=${moduleRef},moduleKey=${moduleKey},methodName=${methodName})`, { "event.action": "createRequestScopedHandler", "logrite.instanceWrapper": instanceWrapper, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey, "logrite.methodName": methodName });
  }

  public createRequestScopedEventHandler(
    instanceWrapper: InstanceWrapper<NestGateway>,
    moduleRef: Module,
    moduleKey: string,
    methodName: 'handleConnection' | 'handleDisconnect',
    server: object,
  ) {
	logger.error(`>>> Entering createRequestScopedEventHandler(instanceWrapper=${instanceWrapper},moduleRef=${moduleRef},moduleKey=${moduleKey},methodName=${methodName},server=${server})`, { "event.action": "createRequestScopedEventHandler", "logrite.instanceWrapper": instanceWrapper, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey, "logrite.methodName": methodName, "logrite.server": server });
    const { instance } = instanceWrapper;
    const collection = moduleRef.providers;
    const isTreeDurable = instanceWrapper.isDependencyTreeDurable();
    const targetCallback = instance[methodName];

    return async (...args: unknown[]) => {
      const [client] = args;
      let contextId: ContextId | undefined;

      try {
        contextId = this.getContextId(
          client as Record<any, any>,
          isTreeDurable,
        );
        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          collection,
          contextId,
        );
        this.assignServerToProperties(contextInstance, server);
        const scopedMethod = contextInstance[methodName] as
          | ((...methodArgs: unknown[]) => unknown)
          | undefined;
        return scopedMethod?.apply(contextInstance, args);
      } catch (err) {
		logger.error(`Exception in createRequestScopedEventHandler(instanceWrapper=${instanceWrapper},moduleRef=${moduleRef},moduleKey=${moduleKey},methodName=${methodName},server=${server}): ${(err as Error).message}`, err, { "event.action": "createRequestScopedEventHandler", "event.category": "process", "logrite.instanceWrapper": instanceWrapper, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey, "logrite.methodName": methodName, "logrite.server": server });
        if (!targetCallback) {
          throw err;
        }
        let exceptionFilter = this.exceptionFiltersCache.get(targetCallback);
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionFiltersContext.create(
            instance,
            targetCallback as <TClient>(client: TClient, data: any) => any,
            moduleKey,
          );
          this.exceptionFiltersCache.set(targetCallback, exceptionFilter);
        }
        const host = new ExecutionContextHost(args);
        host.setType('ws');
        exceptionFilter.handle(err as Error, host);
      } finally {
        if (methodName === 'handleDisconnect' && contextId) {
          this.cleanupRequestScopedContext(
            instanceWrapper,
            contextId,
            client as Record<any, any>,
          );
        }
      }
    };
	logger.warn(`<<< Exiting createRequestScopedEventHandler(instanceWrapper=${instanceWrapper},moduleRef=${moduleRef},moduleKey=${moduleKey},methodName=${methodName},server=${server})`, { "event.action": "createRequestScopedEventHandler", "logrite.instanceWrapper": instanceWrapper, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey, "logrite.methodName": methodName, "logrite.server": server });
  }

  public getContextId<T extends Record<any, unknown> = any>(
    request: T,
    isTreeDurable: boolean,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: true,
      });

      const requestProviderValue = isTreeDurable
        ? contextId.payload
        : Object.assign(request, contextId.payload);
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }

  private cleanupRequestScopedContext(
    _instanceWrapper: InstanceWrapper<NestGateway>,
    _contextId: ContextId,
    request: Record<any, any>,
  ) {
	logger.error(`>>> Entering cleanupRequestScopedContext(_instanceWrapper=${_instanceWrapper},_contextId=${_contextId},request=${request})`, { "event.action": "cleanupRequestScopedContext", "logrite._instanceWrapper": _instanceWrapper, "logrite._contextId": _contextId });
    Reflect.deleteProperty(request, REQUEST_CONTEXT_ID as any);
	logger.warn(`<<< Exiting cleanupRequestScopedContext(_instanceWrapper=${_instanceWrapper},_contextId=${_contextId},request=${request})`, { "event.action": "cleanupRequestScopedContext", "logrite._instanceWrapper": _instanceWrapper, "logrite._contextId": _contextId });
  }

  private assignServerToProperties<T = any>(
    instance: NestGateway,
    server: object,
  ) {
	logger.error(`>>> Entering assignServerToProperties(instance=${instance},server=${server})`, { "event.action": "assignServerToProperties", "logrite.instance": instance, "logrite.server": server });
    for (const propertyKey of this.metadataExplorer.scanForServerHooks(
      instance,
    )) {
      Reflect.set(instance, propertyKey, server);
	logger.warn(`<<< Exiting assignServerToProperties(instance=${instance},server=${server})`, { "event.action": "assignServerToProperties", "logrite.instance": instance, "logrite.server": server });
    }
  }

  private printSubscriptionLogs(
    instance: NestGateway,
    subscribersMap: MessageMappingProperties[],
  ) {
	logger.error(`>>> Entering printSubscriptionLogs(instance=${instance},subscribersMap=${subscribersMap})`, { "event.action": "printSubscriptionLogs", "logrite.instance": instance, "logrite.subscribersMap": subscribersMap });
    const gatewayClassName = (instance as object)?.constructor?.name;
    if (!gatewayClassName) {
	logger.warn(`<<< Exiting printSubscriptionLogs(instance=${instance},subscribersMap=${subscribersMap})`, { "event.action": "printSubscriptionLogs", "logrite.instance": instance, "logrite.subscribersMap": subscribersMap });
      return;
    }
    subscribersMap.forEach(({ message }) =>
      this.logger.log(
        `${gatewayClassName} subscribed to the "${message}" message`,
      ),
    );
  }
}
