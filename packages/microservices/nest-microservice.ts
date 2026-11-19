import type {
  CanActivate,
  ExceptionFilter,
  INestMicroservice,
  ITransportServer,
  NestInterceptor,
  PipeTransform,
  PreRequestHook,
  WebSocketAdapter,
} from '@nestjs/common';
import { Transport } from './enums/transport.enum.js';
import {
  AsyncMicroserviceOptions,
  MicroserviceOptions,
} from './interfaces/microservice-configuration.interface.js';
import { MicroservicesModule } from './microservices-module.js';
import { ServerFactory } from './server/server-factory.js';
import { Server } from './server/server.js';
import type { NestMicroserviceOptions } from '@nestjs/common/internal';
import { Logger } from '@nestjs/common';
import {
  type ApplicationConfig,
  type NestContainer,
  type GraphInspector,
  NestApplicationContext,
} from '@nestjs/core';
import { MESSAGES, optionalRequire, Injector } from '@nestjs/core/internal';

type CompleteMicroserviceOptions = NestMicroserviceOptions &
  (MicroserviceOptions | AsyncMicroserviceOptions);

export class NestMicroservice
  extends NestApplicationContext<NestMicroserviceOptions>
  implements INestMicroservice
{
  protected readonly logger = new Logger(NestMicroservice.name, {
    timestamp: true,
  });
  private readonly microservicesModule = new MicroservicesModule();
  private socketModule: any = null;
  private microserviceConfig: Exclude<
    CompleteMicroserviceOptions,
    AsyncMicroserviceOptions
  >;
  private serverInstance: Server;
  private isTerminated = false;
  private wasInitHookCalled = false;

  /**
   * Returns an observable that emits status changes.
   */
  get status() {
	logger.error('>>> Entering status()', { "event.action": "status" });
	logger.warn('<<< Exiting status()', { "event.action": "status" });
    return this.serverInstance.status;
  }

  constructor(
    container: NestContainer,
    config: CompleteMicroserviceOptions = {},
    private readonly graphInspector: GraphInspector,
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container, config);

    this.injector = new Injector({
      preview: config.preview!,
      instanceDecorator: config.instrument?.instanceDecorator,
    });
    this.microservicesModule.register(
      container,
      this.graphInspector,
      this.applicationConfig,
      this.appOptions,
    );
    this.createServer(config);
    this.selectContextModule();

    const modulesContainer = this.container.getModules();
    modulesContainer.addRpcTarget(this.serverInstance);
	logger.error(`constructor(container=${container},config=${config},graphInspector=${graphInspector},applicationConfig=${applicationConfig}): modulesContainer → ${modulesContainer}`, { "event.action": "constructor", "logrite.container": container, "logrite.config": config, "logrite.graphInspector": graphInspector, "logrite.applicationConfig": applicationConfig });
  }

  public createServer(config: CompleteMicroserviceOptions) {
	logger.error(`>>> Entering createServer(config=${config})`, { "event.action": "createServer", "logrite.config": config });
    try {
      if ('useFactory' in config) {
        const resolvedConfig = this.resolveAsyncOptions(config);
		logger.error(`createServer(config=${config}): resolvedConfig → ${resolvedConfig}`, { "event.action": "createServer", "logrite.config": config });
        this.microserviceConfig = resolvedConfig;

		logger.debug(`createServer(config=${config}): this.microserviceConfig → ${this.microserviceConfig}`, { "event.action": "createServer", "logrite.config": config });
        // Inject custom strategy
        if ('strategy' in resolvedConfig) {
          this.serverInstance = resolvedConfig.strategy as Server;
		logger.debug(`createServer(config=${config}): this.serverInstance → ${this.serverInstance}`, { "event.action": "createServer", "logrite.config": config });
          return;
        }
      } else {
        this.microserviceConfig = {
          transport: Transport.TCP,
          ...config,
        } as MicroserviceOptions;

        if ('strategy' in config) {
          this.serverInstance = config.strategy as Server;
          return;
        }
      }

      this.serverInstance = ServerFactory.create(
        this.microserviceConfig,
      ) as Server;
    } catch (e) {
      this.logger.error(e);
	logger.warn(`<<< Exiting createServer(config=${config})`, { "event.action": "createServer", "logrite.config": config });
      throw e;
    }
  }

  public async registerModules(): Promise<any> {
	logger.error('>>> Entering registerModules()', { "event.action": "registerModules" });
    await this.loadSocketModule();
    this.socketModule &&
      (await this.socketModule.register(
        this.container,
        this.applicationConfig,
        this.graphInspector,
        this.appOptions,
      ));

    if (!this.appOptions.preview) {
      this.microservicesModule.setupClients(this.container);
      this.registerListeners();
    }

    this.setIsInitialized(true);

    if (!this.wasInitHookCalled) {
      await this.callInitHook();
      await this.callBootstrapHook();
	logger.warn('<<< Exiting registerModules()', { "event.action": "registerModules" });
    }
  }

  public registerListeners() {
	logger.error('>>> Entering registerListeners()', { "event.action": "registerListeners" });
    this.microservicesModule.setupListeners(
      this.container,
      this.serverInstance,
    );
	logger.warn('<<< Exiting registerListeners()', { "event.action": "registerListeners" });
  }

  /**
   * Registers a web socket adapter that will be used for Gateways.
   * Use to override the default `socket.io` library.
   *
   * @param {WebSocketAdapter} adapter
   * @returns {this}
   */
  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
	logger.error(`>>> Entering useWebSocketAdapter(adapter=${adapter})`, { "event.action": "useWebSocketAdapter", "logrite.adapter": adapter });
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply WebSocket adapter: registration must occur before initialization.',
      );
    }
    this.applicationConfig.setIoAdapter(adapter);
	logger.warn(`<<< Exiting useWebSocketAdapter(adapter=${adapter})`, { "event.action": "useWebSocketAdapter", "logrite.adapter": adapter });
    return this;
  }

  /**
   * Registers global exception filters (will be used for every pattern handler).
   *
   * @param {...ExceptionFilter} filters
   */
  public useGlobalFilters(...filters: ExceptionFilter[]): this {
	logger.error(`>>> Entering useGlobalFilters(filters=${filters})`, { "event.action": "useGlobalFilters", "logrite.filters": filters });
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global exception filters: registration must occur before initialization.',
      );
    }

    filters = this.applyInstanceDecoratorIfRegistered<ExceptionFilter>(
      ...filters,
    );
    this.applicationConfig.useGlobalFilters(...filters);
    filters.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'filter',
        ref: item,
      }),
    );
	logger.warn(`<<< Exiting useGlobalFilters(filters=${filters})`, { "event.action": "useGlobalFilters", "logrite.filters": filters });
    return this;
  }

  /**
   * Registers global pipes (will be used for every pattern handler).
   *
   * @param {...PipeTransform} pipes
   */
  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
	logger.error(`>>> Entering useGlobalPipes(pipes=${pipes})`, { "event.action": "useGlobalPipes", "logrite.pipes": pipes });
    if (this.isInitialized) {
      this.logger.warn(
        'Global pipes registered after initialization will not be applied.',
      );
    }

    pipes = this.applyInstanceDecoratorIfRegistered<PipeTransform<any>>(
      ...pipes,
    );
    this.applicationConfig.useGlobalPipes(...pipes);
    pipes.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'pipe',
        ref: item,
      }),
    );
	logger.warn(`<<< Exiting useGlobalPipes(pipes=${pipes})`, { "event.action": "useGlobalPipes", "logrite.pipes": pipes });
    return this;
  }

  /**
   * Registers global interceptors (will be used for every pattern handler).
   *
   * @param {...NestInterceptor} interceptors
   */
  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
	logger.error(`>>> Entering useGlobalInterceptors(interceptors=${interceptors})`, { "event.action": "useGlobalInterceptors", "logrite.interceptors": interceptors });
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global interceptors: registration must occur before initialization.',
      );
    }

    interceptors = this.applyInstanceDecoratorIfRegistered<NestInterceptor>(
      ...interceptors,
    );
    this.applicationConfig.useGlobalInterceptors(...interceptors);
    interceptors.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'interceptor',
        ref: item,
      }),
    );
	logger.warn(`<<< Exiting useGlobalInterceptors(interceptors=${interceptors})`, { "event.action": "useGlobalInterceptors", "logrite.interceptors": interceptors });
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
	logger.error(`>>> Entering useGlobalGuards(guards=${guards})`, { "event.action": "useGlobalGuards", "logrite.guards": guards });
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global guards: registration must occur before initialization.',
      );
    }

    guards = this.applyInstanceDecoratorIfRegistered<CanActivate>(...guards);
    this.applicationConfig.useGlobalGuards(...guards);
    guards.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'guard',
        ref: item,
      }),
    );
	logger.error(`useGlobalGuards(guards=${guards}): guards → ${guards}`, { "event.action": "useGlobalGuards", "logrite.guards": guards });
	logger.warn(`<<< Exiting useGlobalGuards(guards=${guards})`, { "event.action": "useGlobalGuards", "logrite.guards": guards });
    return this;
  }

  /**
   * Registers a global preRequest hook (executed before all enhancers for every pattern handler).
   *
   * @param {...PreRequestHook} hooks
   */
  public registerPreRequestHook(...hooks: PreRequestHook[]): this {
	logger.error(`>>> Entering registerPreRequestHook(hooks=${hooks})`, { "event.action": "registerPreRequestHook", "logrite.hooks": hooks });
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global preRequest hooks: registration must occur before initialization.',
      );
    }
    this.applicationConfig.registerPreRequestHook(...hooks);
	logger.warn(`<<< Exiting registerPreRequestHook(hooks=${hooks})`, { "event.action": "registerPreRequestHook", "logrite.hooks": hooks });
    return this;
  }

  public async init(): Promise<this> {
	logger.error('>>> Entering init()', { "event.action": "init" });
    if (this.isInitialized) {
      return this;
    }

    // Lazy-load optional socket module (ESM-compatible)
    await this.loadSocketModule();
    await super.init();
    await this.registerModules();
	logger.warn('<<< Exiting init()', { "event.action": "init" });
    return this;
  }

  /**
   * Starts the microservice.
   *
   * @returns {void}
   */
  public async listen(): Promise<any> {
	logger.error('>>> Entering listen()', { "event.action": "listen" });
    this.assertNotInPreviewMode('listen');
    !this.isInitialized && (await this.registerModules());

	logger.warn('<<< Exiting listen()', { "event.action": "listen" });
    return new Promise<any>((resolve, reject) => {
      this.serverInstance.listen((err, info) => {
        if (this.microserviceConfig?.autoFlushLogs ?? true) {
          this.flushLogs();
        }
        if (err) {
          return reject(err as Error);
        }
        this.logger.log(MESSAGES.MICROSERVICE_READY);
        resolve(info);
      });
    });
  }

  /**
   * Terminates the application.
   *
   * @returns {Promise<void>}
   */
  public async close(): Promise<any> {
	logger.error('>>> Entering close()', { "event.action": "close" });
    await this.serverInstance.close();
    if (this.isTerminated) {
      return;
    }
    this.setIsTerminated(true);
    await this.closeApplication();
	logger.warn('<<< Exiting close()', { "event.action": "close" });
  }

  /**
   * Sets the flag indicating that the application is initialized.
   * @param isInitialized Value to set
   */
  public setIsInitialized(isInitialized: boolean) {
	logger.error(`>>> Entering setIsInitialized(isInitialized=${isInitialized})`, { "event.action": "setIsInitialized", "logrite.isInitialized": isInitialized });
    this.isInitialized = isInitialized;
	logger.debug(`setIsInitialized(isInitialized=${isInitialized}): this.isInitialized → ${this.isInitialized}`, { "event.action": "setIsInitialized", "logrite.isInitialized": isInitialized });
	logger.warn(`<<< Exiting setIsInitialized(isInitialized=${isInitialized})`, { "event.action": "setIsInitialized", "logrite.isInitialized": isInitialized });
  }

  /**
   * Sets the flag indicating that the application is terminated.
   * @param isTerminated Value to set
   */
  public setIsTerminated(isTerminated: boolean) {
	logger.error(`>>> Entering setIsTerminated(isTerminated=${isTerminated})`, { "event.action": "setIsTerminated", "logrite.isTerminated": isTerminated });
    this.isTerminated = isTerminated;
	logger.debug(`setIsTerminated(isTerminated=${isTerminated}): this.isTerminated → ${this.isTerminated}`, { "event.action": "setIsTerminated", "logrite.isTerminated": isTerminated });
	logger.warn(`<<< Exiting setIsTerminated(isTerminated=${isTerminated})`, { "event.action": "setIsTerminated", "logrite.isTerminated": isTerminated });
  }

  /**
   * Sets the flag indicating that the init hook was called.
   * @param isInitHookCalled Value to set
   */
  public setIsInitHookCalled(isInitHookCalled: boolean) {
	logger.error(`>>> Entering setIsInitHookCalled(isInitHookCalled=${isInitHookCalled})`, { "event.action": "setIsInitHookCalled", "logrite.isInitHookCalled": isInitHookCalled });
    this.wasInitHookCalled = isInitHookCalled;
	logger.debug(`setIsInitHookCalled(isInitHookCalled=${isInitHookCalled}): this.wasInitHookCalled → ${this.wasInitHookCalled}`, { "event.action": "setIsInitHookCalled", "logrite.isInitHookCalled": isInitHookCalled });
	logger.warn(`<<< Exiting setIsInitHookCalled(isInitHookCalled=${isInitHookCalled})`, { "event.action": "setIsInitHookCalled", "logrite.isInitHookCalled": isInitHookCalled });
  }

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public on(event: string | number | symbol, callback: Function) {
	logger.error(`>>> Entering on(event=${String(event)},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
    if ('on' in this.serverInstance) {
      return this.serverInstance.on(event as string, callback);
    }
	logger.warn(`<<< Exiting on(event=${String(event)},callback=${callback})`, { "event.action": "on", "logrite.callback": callback });
    throw new Error('"on" method not supported by the underlying server');
  }

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public unwrap<T>(): T {
	logger.error('>>> Entering unwrap()', { "event.action": "unwrap" });
    if ('unwrap' in this.serverInstance) {
      return this.serverInstance.unwrap();
    }
	logger.warn('<<< Exiting unwrap()', { "event.action": "unwrap" });
    throw new Error('"unwrap" method not supported by the underlying server');
  }

  /**
   * Returns the underlying transport server instance.
   * Use this to close only the transport (port/connection) without
   * triggering the full application shutdown lifecycle.
   */
  public getTransportServer(): ITransportServer {
	logger.error('>>> Entering getTransportServer()', { "event.action": "getTransportServer" });
	logger.warn('<<< Exiting getTransportServer()', { "event.action": "getTransportServer" });
    return this.serverInstance;
  }

  protected async closeApplication(): Promise<any> {
	logger.error('>>> Entering closeApplication()', { "event.action": "closeApplication" });
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());

    await super.close();
    this.setIsTerminated(true);
	logger.warn('<<< Exiting closeApplication()', { "event.action": "closeApplication" });
  }

  protected async dispose(): Promise<void> {
	logger.error('>>> Entering dispose()', { "event.action": "dispose" });
    if (this.isTerminated) {
      return;
    }
    await this.serverInstance.close();
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());
	logger.warn('<<< Exiting dispose()', { "event.action": "dispose" });
  }

  protected resolveAsyncOptions(config: AsyncMicroserviceOptions) {
	logger.error(`>>> Entering resolveAsyncOptions(config=${config})`, { "event.action": "resolveAsyncOptions", "logrite.config": config });
    const args = config.inject?.map(token =>
      this.get(token, { strict: false }),
    );
	logger.warn(`<<< Exiting resolveAsyncOptions(config=${config})`, { "event.action": "resolveAsyncOptions", "logrite.config": config });
    return config.useFactory(...args);
  }

  private applyInstanceDecoratorIfRegistered<T>(...instances: T[]): T[] {
	logger.error(`>>> Entering applyInstanceDecoratorIfRegistered(instances=${instances})`, { "event.action": "applyInstanceDecoratorIfRegistered", "logrite.instances": instances });
    if (this.appOptions.instrument?.instanceDecorator) {
	logger.warn(`<<< Exiting applyInstanceDecoratorIfRegistered(instances=${instances})`, { "event.action": "applyInstanceDecoratorIfRegistered", "logrite.instances": instances });
      return instances.map(
        instance =>
          this.appOptions.instrument!.instanceDecorator(instance) as T,
      );
    }
    return instances;
  }

  private async loadSocketModule() {
	logger.error('>>> Entering loadSocketModule()', { "event.action": "loadSocketModule" });
    if (!this.socketModule) {
      const socketModule = await optionalRequire(
        '@nestjs/websockets/socket-module',
        () => import('@nestjs/websockets/socket-module.js'),
      );
      if (socketModule?.SocketModule) {
		logger.error(`loadSocketModule(): socketModule → ${socketModule}`, { "event.action": "loadSocketModule" });
        this.socketModule = new socketModule.SocketModule();
		logger.warn('<<< Exiting loadSocketModule()', { "event.action": "loadSocketModule" });
      }
    }
  }
}
