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
	logger.debug('>>> Entering status()');
	logger.debug('<<< Exiting status()');
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
	logger.debug(`constructor(container=${container},config=${config},graphInspector=${graphInspector},applicationConfig=${applicationConfig}): modulesContainer → ${modulesContainer}`);
  }

  public createServer(config: CompleteMicroserviceOptions) {
	logger.debug(`>>> Entering createServer(config=${config})`);
    try {
      if ('useFactory' in config) {
        const resolvedConfig = this.resolveAsyncOptions(config);
		logger.debug(`createServer(config=${config}): resolvedConfig → ${resolvedConfig}`);
        this.microserviceConfig = resolvedConfig;

        // Inject custom strategy
        if ('strategy' in resolvedConfig) {
		logger.debug(`createServer(config=${config}): this.microserviceConfig → ${this.microserviceConfig}`);
          this.serverInstance = resolvedConfig.strategy as Server;
          return;
        }
      } else {
		logger.debug(`createServer(config=${config}): this.serverInstance → ${this.serverInstance}`);
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
	logger.debug(`<<< Exiting createServer(config=${config})`);
      throw e;
    }
  }

  public async registerModules(): Promise<any> {
    await this.loadSocketModule();
    this.socketModule &&
      (await this.socketModule.register(
        this.container,
        this.applicationConfig,
        this.graphInspector,
        this.appOptions,
      ));

    if (!this.appOptions.preview) {
	logger.debug('>>> Entering registerModules()');
      this.microservicesModule.setupClients(this.container);
      this.registerListeners();
    }

    this.setIsInitialized(true);

    if (!this.wasInitHookCalled) {
      await this.callInitHook();
      await this.callBootstrapHook();
	logger.debug('<<< Exiting registerModules()');
    }
  }

  public registerListeners() {
	logger.debug('>>> Entering registerListeners()');
    this.microservicesModule.setupListeners(
      this.container,
      this.serverInstance,
    );
	logger.debug('<<< Exiting registerListeners()');
  }

  /**
   * Registers a web socket adapter that will be used for Gateways.
   * Use to override the default `socket.io` library.
   *
   * @param {WebSocketAdapter} adapter
   * @returns {this}
   */
  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    if (this.isInitialized) {
	logger.debug(`>>> Entering useWebSocketAdapter(adapter=${adapter})`);
      this.logger.warn(
        'Cannot apply WebSocket adapter: registration must occur before initialization.',
      );
    }
    this.applicationConfig.setIoAdapter(adapter);
	logger.debug(`<<< Exiting useWebSocketAdapter(adapter=${adapter})`);
    return this;
  }

  /**
   * Registers global exception filters (will be used for every pattern handler).
   *
   * @param {...ExceptionFilter} filters
   */
  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    if (this.isInitialized) {
	logger.debug(`>>> Entering useGlobalFilters(filters=${filters})`);
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
	logger.debug(`<<< Exiting useGlobalFilters(filters=${filters})`);
    return this;
  }

  /**
   * Registers global pipes (will be used for every pattern handler).
   *
   * @param {...PipeTransform} pipes
   */
  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    if (this.isInitialized) {
	logger.debug(`>>> Entering useGlobalPipes(pipes=${pipes})`);
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
	logger.debug(`<<< Exiting useGlobalPipes(pipes=${pipes})`);
    return this;
  }

  /**
   * Registers global interceptors (will be used for every pattern handler).
   *
   * @param {...NestInterceptor} interceptors
   */
  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    if (this.isInitialized) {
	logger.debug(`>>> Entering useGlobalInterceptors(interceptors=${interceptors})`);
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
	logger.debug(`<<< Exiting useGlobalInterceptors(interceptors=${interceptors})`);
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    if (this.isInitialized) {
	logger.debug(`>>> Entering useGlobalGuards(guards=${guards})`);
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
	logger.debug(`useGlobalGuards(guards=${guards}): guards → ${guards}`);
	logger.debug(`<<< Exiting useGlobalGuards(guards=${guards})`);
    return this;
  }

  /**
   * Registers a global preRequest hook (executed before all enhancers for every pattern handler).
   *
   * @param {...PreRequestHook} hooks
   */
  public registerPreRequestHook(...hooks: PreRequestHook[]): this {
    if (this.isInitialized) {
	logger.debug(`>>> Entering registerPreRequestHook(hooks=${hooks})`);
      this.logger.warn(
        'Cannot apply global preRequest hooks: registration must occur before initialization.',
      );
    }
    this.applicationConfig.registerPreRequestHook(...hooks);
	logger.debug(`<<< Exiting registerPreRequestHook(hooks=${hooks})`);
    return this;
  }

  public async init(): Promise<this> {
    if (this.isInitialized) {
	logger.debug('>>> Entering init()');
      return this;
    }

    // Lazy-load optional socket module (ESM-compatible)
    await this.loadSocketModule();
    await super.init();
    await this.registerModules();
	logger.debug('<<< Exiting init()');
    return this;
  }

  /**
   * Starts the microservice.
   *
   * @returns {void}
   */
  public async listen(): Promise<any> {
    this.assertNotInPreviewMode('listen');
    !this.isInitialized && (await this.registerModules());

    return new Promise<any>((resolve, reject) => {
	logger.debug('>>> Entering listen()');
      this.serverInstance.listen((err, info) => {
		logger.debug('<<< Exiting listen()');
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
    await this.serverInstance.close();
    if (this.isTerminated) {
	logger.debug('>>> Entering close()');
      return;
    }
    this.setIsTerminated(true);
    await this.closeApplication();
	logger.debug('<<< Exiting close()');
  }

  /**
   * Sets the flag indicating that the application is initialized.
   * @param isInitialized Value to set
   */
  public setIsInitialized(isInitialized: boolean) {
	logger.debug(`>>> Entering setIsInitialized(isInitialized=${isInitialized})`);
    this.isInitialized = isInitialized;
  }

  /**
   * Sets the flag indicating that the application is terminated.
   * @param isTerminated Value to set
   */
  public setIsTerminated(isTerminated: boolean) {
	logger.debug(`>>> Entering setIsTerminated(isTerminated=${isTerminated})`);
    this.isTerminated = isTerminated;
  }

  /**
   * Sets the flag indicating that the init hook was called.
   * @param isInitHookCalled Value to set
   */
  public setIsInitHookCalled(isInitHookCalled: boolean) {
	logger.debug(`>>> Entering setIsInitHookCalled(isInitHookCalled=${isInitHookCalled})`);
    this.wasInitHookCalled = isInitHookCalled;
	logger.debug(`setIsInitHookCalled(isInitHookCalled=${isInitHookCalled}): this.wasInitHookCalled → ${this.wasInitHookCalled}`);
  }

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public on(event: string | number | symbol, callback: Function) {
	logger.debug(`>>> Entering on(event=${event},callback=${callback})`);
    if ('on' in this.serverInstance) {
      return this.serverInstance.on(event as string, callback);
    }
	logger.debug(`<<< Exiting on(event=${event},callback=${callback})`);
    throw new Error('"on" method not supported by the underlying server');
  }

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public unwrap<T>(): T {
    if ('unwrap' in this.serverInstance) {
	logger.debug('>>> Entering unwrap()');
      return this.serverInstance.unwrap();
    }
	logger.debug('<<< Exiting unwrap()');
    throw new Error('"unwrap" method not supported by the underlying server');
  }

  /**
   * Returns the underlying transport server instance.
   * Use this to close only the transport (port/connection) without
   * triggering the full application shutdown lifecycle.
   */
  public getTransportServer(): ITransportServer {
	logger.debug('>>> Entering getTransportServer()');
	logger.debug('<<< Exiting getTransportServer()');
    return this.serverInstance;
  }

  protected async closeApplication(): Promise<any> {
	logger.debug('>>> Entering closeApplication()');
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());

    await super.close();
    this.setIsTerminated(true);
	logger.debug('<<< Exiting closeApplication()');
  }

  protected async dispose(): Promise<void> {
    if (this.isTerminated) {
	logger.debug('>>> Entering dispose()');
      return;
    }
    await this.serverInstance.close();
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());
	logger.debug('<<< Exiting dispose()');
  }

  protected resolveAsyncOptions(config: AsyncMicroserviceOptions) {
	logger.debug(`>>> Entering resolveAsyncOptions(config=${config})`);
    const args = config.inject?.map(token =>
      this.get(token, { strict: false }),
    );
	logger.debug(`<<< Exiting resolveAsyncOptions(config=${config})`);
    return config.useFactory(...args);
  }

  private applyInstanceDecoratorIfRegistered<T>(...instances: T[]): T[] {
    if (this.appOptions.instrument?.instanceDecorator) {
	logger.debug(`>>> Entering applyInstanceDecoratorIfRegistered(instances=${instances})`);
	logger.debug(`<<< Exiting applyInstanceDecoratorIfRegistered(instances=${instances})`);
      return instances.map(
        instance =>
          this.appOptions.instrument!.instanceDecorator(instance) as T,
      );
    }
    return instances;
  }

  private async loadSocketModule() {
	logger.debug('>>> Entering loadSocketModule()');
    if (!this.socketModule) {
      const socketModule = await optionalRequire(
        '@nestjs/websockets/socket-module',
        () => import('@nestjs/websockets/socket-module.js'),
      );
      if (socketModule?.SocketModule) {
		logger.debug(`loadSocketModule(): socketModule → ${socketModule}`);
        this.socketModule = new socketModule.SocketModule();
		logger.debug('<<< Exiting loadSocketModule()');
      }
    }
  }
}
