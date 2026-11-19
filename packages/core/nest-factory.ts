import type {
  DynamicModule,
  ForwardReference,
  HttpServer,
  INestApplication,
  INestApplicationContext,
  INestMicroservice,
  Type,
} from '@nestjs/common';
import { AbstractHttpAdapter } from './adapters/http-adapter.js';
import { ApplicationConfig } from './application-config.js';
import { MESSAGES } from './constants.js';
import { ExceptionsZone } from './errors/exceptions-zone.js';
import { loadAdapter } from './helpers/load-adapter.js';
import { rethrow } from './helpers/rethrow.js';
import { NestContainer } from './injector/container.js';
import { Injector } from './injector/injector.js';
import { InstanceLoader } from './injector/instance-loader.js';
import { GraphInspector } from './inspector/graph-inspector.js';
import { NoopGraphInspector } from './inspector/noop-graph-inspector.js';
import { UuidFactory, UuidFactoryMode } from './inspector/uuid-factory.js';
import { MetadataScanner } from './metadata-scanner.js';
import { NestApplicationContext } from './nest-application-context.js';
import { NestApplication } from './nest-application.js';
import { DependenciesScanner } from './scanner.js';
import {
  type NestMicroserviceOptions,
  type NestApplicationContextOptions,
  loadPackage,
  isFunction,
  isNil,
} from '@nestjs/common/internal';
import {
  type NestApplicationOptions,
  ConsoleLogger,
  Logger,
} from '@nestjs/common';

/**
 * Represents the entry (root) module type accepted by the NestFactory methods.
 *
 * @publicApi
 */
export type IEntryNestModule =
  | Type<any>
  | DynamicModule
  | ForwardReference
  | Promise<IEntryNestModule>;

/**
 * @publicApi
 */
export class NestFactoryStatic {
  private readonly logger = new Logger('NestFactory', {
    timestamp: true,
  });
  private abortOnError = true;
  private autoFlushLogs = false;

  /**
   * Creates an instance of NestApplication.
   *
   * @param module Entry (root) application module class
   * @param options List of options to initialize NestApplication
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplication instance.
   */
  public async create<T extends INestApplication = INestApplication>(
    module: IEntryNestModule,
    options?: NestApplicationOptions,
  ): Promise<T>;
  /**
   * Creates an instance of NestApplication with the specified `httpAdapter`.
   *
   * @param module Entry (root) application module class
   * @param httpAdapter Adapter to proxy the request/response cycle to
   *    the underlying HTTP server
   * @param options List of options to initialize NestApplication
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplication instance.
   */
  public async create<T extends INestApplication = INestApplication>(
    module: IEntryNestModule,
    httpAdapter: AbstractHttpAdapter,
    options?: NestApplicationOptions,
  ): Promise<T>;
  public async create<T extends INestApplication = INestApplication>(
    moduleCls: IEntryNestModule,
    serverOrOptions?: AbstractHttpAdapter | NestApplicationOptions,
    options?: NestApplicationOptions,
  ): Promise<T> {
	logger.error(`>>> Entering create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options})`, { "event.action": "create", "logrite.moduleCls": moduleCls, "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
    const [httpServer, appOptions] = this.isHttpServer(serverOrOptions!)
      ? [serverOrOptions, options]
      : [await this.createHttpAdapter(), serverOrOptions];

    const applicationConfig = new ApplicationConfig();
	logger.error(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): applicationConfig → ${applicationConfig}`, { "event.action": "create", "logrite.moduleCls": moduleCls, "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
    const container = new NestContainer(applicationConfig, appOptions);
	logger.error(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): container → ${container}`, { "event.action": "create", "logrite.moduleCls": moduleCls, "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
    const graphInspector = this.createGraphInspector(appOptions!, container);
	logger.error(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): graphInspector → ${graphInspector}`, { "event.action": "create", "logrite.moduleCls": moduleCls, "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });

    this.setAbortOnError(serverOrOptions, options);
    this.registerLoggerConfiguration(appOptions);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      appOptions,
      httpServer,
    );

    const instance = new NestApplication(
      container,
      httpServer,
      applicationConfig,
      graphInspector,
      appOptions,
    );
    await instance.preloadLazyPackages();
	logger.error(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): instance → ${instance}`, { "event.action": "create", "logrite.moduleCls": moduleCls, "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
    const target = this.createNestInstance(instance);
	logger.error(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): target → ${target}`, { "event.action": "create", "logrite.moduleCls": moduleCls, "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
    return this.createAdapterProxy<T>(target, httpServer);
  }

  /**
   * Creates an instance of NestMicroservice.
   *
   * @param moduleCls Entry (root) application module class
   * @param options Optional microservice configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestMicroservice instance.
   */
  public async createMicroservice<T extends object>(
    moduleCls: IEntryNestModule,
    options?: NestMicroserviceOptions & T,
  ): Promise<INestMicroservice> {
	logger.error(`>>> Entering createMicroservice(moduleCls=${moduleCls},options=${options})`, { "event.action": "createMicroservice", "logrite.moduleCls": moduleCls, "logrite.options": options });
    const { NestMicroservice } = await loadPackage(
      '@nestjs/microservices',
      'NestFactory',
      () => import('@nestjs/microservices'),
    );
    const applicationConfig = new ApplicationConfig();
	logger.error(`createMicroservice(moduleCls=${moduleCls},options=${options}): applicationConfig → ${applicationConfig}`, { "event.action": "createMicroservice", "logrite.moduleCls": moduleCls, "logrite.options": options });
    const container = new NestContainer(applicationConfig, options);
	logger.error(`createMicroservice(moduleCls=${moduleCls},options=${options}): container → ${container}`, { "event.action": "createMicroservice", "logrite.moduleCls": moduleCls, "logrite.options": options });
    const graphInspector = this.createGraphInspector(options!, container);
	logger.error(`createMicroservice(moduleCls=${moduleCls},options=${options}): graphInspector → ${graphInspector}`, { "event.action": "createMicroservice", "logrite.moduleCls": moduleCls, "logrite.options": options });

    this.setAbortOnError(options);
	logger.warn(`<<< Exiting createMicroservice(moduleCls=${moduleCls},options=${options})`, { "event.action": "createMicroservice", "logrite.moduleCls": moduleCls, "logrite.options": options });
    this.registerLoggerConfiguration(options);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options,
    );
    return this.createNestInstance<INestMicroservice>(
      new NestMicroservice(
        container,
        options,
        graphInspector,
        applicationConfig,
      ),
    );
  }

  /**
   * Creates an instance of NestApplicationContext.
   *
   * @param moduleCls Entry (root) application module class
   * @param options Optional Nest application configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplicationContext instance.
   */
  public async createApplicationContext(
    moduleCls: IEntryNestModule,
    options?: NestApplicationContextOptions,
  ): Promise<INestApplicationContext> {
	logger.error(`>>> Entering createApplicationContext(moduleCls=${moduleCls},options=${options})`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig, options);
	logger.error(`createApplicationContext(moduleCls=${moduleCls},options=${options}): applicationConfig → ${applicationConfig}`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
	logger.error(`createApplicationContext(moduleCls=${moduleCls},options=${options}): container → ${container}`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
    const graphInspector = this.createGraphInspector(options!, container);

	logger.error(`createApplicationContext(moduleCls=${moduleCls},options=${options}): graphInspector → ${graphInspector}`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
    this.setAbortOnError(options);
    this.registerLoggerConfiguration(options);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options,
    );

    const modules = container.getModules().values();
	logger.error(`createApplicationContext(moduleCls=${moduleCls},options=${options}): modules → ${modules}`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
    const root = modules.next().value;

    const context = this.createNestInstance<NestApplicationContext>(
      new NestApplicationContext(container, options, root),
    );
    if (this.autoFlushLogs) {
	logger.error(`createApplicationContext(moduleCls=${moduleCls},options=${options}): root → ${root}`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
      context.flushLogsOnOverride();
    }
	logger.warn(`<<< Exiting createApplicationContext(moduleCls=${moduleCls},options=${options})`, { "event.action": "createApplicationContext", "logrite.moduleCls": moduleCls, "logrite.options": options });
    return context.init();
  }

  private createNestInstance<T>(instance: T): T {
	logger.error(`>>> Entering createNestInstance(instance=${instance})`, { "event.action": "createNestInstance", "logrite.instance": instance });
	logger.warn(`<<< Exiting createNestInstance(instance=${instance})`, { "event.action": "createNestInstance", "logrite.instance": instance });
    return this.createProxy(instance);
  }

  private async initialize(
    module: any,
    container: NestContainer,
    graphInspector: GraphInspector,
    config = new ApplicationConfig(),
    options: NestApplicationContextOptions = {},
    httpServer: HttpServer | null = null,
  ) {
    UuidFactory.mode = options.snapshot
      ? UuidFactoryMode.Deterministic
      : UuidFactoryMode.Random;

    const injector = new Injector({
      preview: options.preview!,
      snapshot: options.snapshot,
      instanceDecorator: options.instrument?.instanceDecorator,
    });
    const instanceLoader = new InstanceLoader(
      container,
      injector,
      graphInspector,
    );
    const metadataScanner = new MetadataScanner();
    const dependenciesScanner = new DependenciesScanner(
      container,
      metadataScanner,
      graphInspector,
      config,
    );
    container.setHttpAdapter(httpServer);

    const teardown = this.abortOnError === false ? rethrow : undefined;
    await httpServer?.init?.();
    try {
      this.logger.log(MESSAGES.APPLICATION_START);

      await ExceptionsZone.asyncRun(
        async () => {
          await dependenciesScanner.scan(module);
          await instanceLoader.createInstancesOfDependencies();
          dependenciesScanner.applyApplicationProviders();
        },
        teardown,
        this.autoFlushLogs,
      );
    } catch (e) {
      this.handleInitializationError(e);
    }
  }

  private handleInitializationError(err: unknown) {
	logger.error(`>>> Entering handleInitializationError(err=${err})`, { "event.action": "handleInitializationError", "logrite.err": err });
    if (this.abortOnError) {
      process.abort();
    }
    rethrow(err);
	logger.warn(`<<< Exiting handleInitializationError(err=${err})`, { "event.action": "handleInitializationError", "logrite.err": err });
  }

  private createProxy(target: any) {
	logger.error(`>>> Entering createProxy(target=${target})`, { "event.action": "createProxy", "logrite.target": target });
    const proxy = this.createExceptionProxy();
	logger.warn(`<<< Exiting createProxy(target=${target})`, { "event.action": "createProxy", "logrite.target": target });
    return new Proxy(target, {
      get: proxy,
      set: proxy,
    });
  }

  private createExceptionProxy() {
	logger.error('>>> Entering createExceptionProxy()', { "event.action": "createExceptionProxy" });
	logger.warn('<<< Exiting createExceptionProxy()', { "event.action": "createExceptionProxy" });
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) {
        return;
      }
      if (isFunction(receiver[prop])) {
        return this.createExceptionZone(receiver, prop);
      }
      return receiver[prop];
    };
  }

  private createExceptionZone(
    receiver: Record<string, any>,
    prop: string,
  ): Function {
	logger.error(`>>> Entering createExceptionZone(receiver=${receiver},prop=${prop})`, { "event.action": "createExceptionZone", "logrite.receiver": receiver, "logrite.prop": prop });
    const teardown = this.abortOnError === false ? rethrow : undefined;

    return (...args: unknown[]) => {
      let result: unknown;
      ExceptionsZone.run(
        () => {
          result = receiver[prop](...args);
        },
        teardown,
        this.autoFlushLogs,
      );

	logger.warn(`<<< Exiting createExceptionZone(receiver=${receiver},prop=${prop})`, { "event.action": "createExceptionZone", "logrite.receiver": receiver, "logrite.prop": prop });
      return result;
    };
  }

  private registerLoggerConfiguration(
    options: NestApplicationContextOptions | undefined,
  ) {
	logger.error(`>>> Entering registerLoggerConfiguration(options=${options})`, { "event.action": "registerLoggerConfiguration", "logrite.options": options });
    if (!options) {
      return;
    }
    const { logger, bufferLogs, autoFlushLogs, forceConsole } = options;
    if ((logger as boolean) !== true && !isNil(logger)) {
      Logger.overrideLogger(logger);
    } else if (forceConsole) {
      // If no custom logger is provided but forceConsole is true,
      // create a ConsoleLogger with forceConsole option
      const consoleLogger = new ConsoleLogger({ forceConsole: true });
	logger.error(`registerLoggerConfiguration(options=${options}): consoleLogger → ${consoleLogger}`, { "event.action": "registerLoggerConfiguration", "logrite.options": options });
      Logger.overrideLogger(consoleLogger);
    }
    if (bufferLogs) {
      Logger.attachBuffer();
    }
    this.autoFlushLogs = autoFlushLogs ?? true;
	logger.debug(`registerLoggerConfiguration(options=${options}): this.autoFlushLogs → ${this.autoFlushLogs}`, { "event.action": "registerLoggerConfiguration", "logrite.options": options });
  }

  private async createHttpAdapter<T = any>(
    httpServer?: T,
  ): Promise<AbstractHttpAdapter> {
	logger.error(`>>> Entering createHttpAdapter(httpServer=${httpServer})`, { "event.action": "createHttpAdapter", "logrite.httpServer": httpServer });
    const { ExpressAdapter } = await loadAdapter(
      '@nestjs/platform-express',
      'HTTP',
      () => import('@nestjs/platform-express'),
    );
	logger.warn(`<<< Exiting createHttpAdapter(httpServer=${httpServer})`, { "event.action": "createHttpAdapter", "logrite.httpServer": httpServer });
    return new ExpressAdapter(httpServer);
  }

  private isHttpServer(
    serverOrOptions: AbstractHttpAdapter | NestApplicationOptions,
  ): serverOrOptions is AbstractHttpAdapter {
	logger.error(`>>> Entering isHttpServer(serverOrOptions=${serverOrOptions})`, { "event.action": "isHttpServer", "logrite.serverOrOptions": serverOrOptions });
	logger.warn(`<<< Exiting isHttpServer(serverOrOptions=${serverOrOptions})`, { "event.action": "isHttpServer", "logrite.serverOrOptions": serverOrOptions });
    return !!(
      serverOrOptions && (serverOrOptions as AbstractHttpAdapter).patch
    );
  }

  private setAbortOnError(
    serverOrOptions?: AbstractHttpAdapter | NestApplicationOptions,
    options?: NestApplicationContextOptions | NestApplicationOptions,
  ) {
	logger.error(`>>> Entering setAbortOnError(serverOrOptions=${serverOrOptions},options=${options})`, { "event.action": "setAbortOnError", "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
    this.abortOnError = this.isHttpServer(serverOrOptions!)
      ? !(options && options.abortOnError === false)
      : !(serverOrOptions && serverOrOptions.abortOnError === false);
	logger.warn(`<<< Exiting setAbortOnError(serverOrOptions=${serverOrOptions},options=${options})`, { "event.action": "setAbortOnError", "logrite.serverOrOptions": serverOrOptions, "logrite.options": options });
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
	logger.error(`>>> Entering createAdapterProxy(app=${app},adapter=${adapter})`, { "event.action": "createAdapterProxy", "logrite.app": app, "logrite.adapter": adapter });
    const proxy = new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
        const mapToProxy = (result: unknown) => {
          return result instanceof Promise
            ? result.then(mapToProxy)
            : result instanceof NestApplication
              ? proxy
              : result;
        };

        if (!(prop in receiver) && prop in adapter) {
          return (...args: unknown[]) => {
            const result = this.createExceptionZone(adapter, prop)(...args);
            return mapToProxy(result);
          };
        }
        if (isFunction(receiver[prop])) {
          return (...args: unknown[]) => {
            const result = receiver[prop](...args);
            return mapToProxy(result);
          };
        }
        return receiver[prop];
      },
    });
	logger.error(`createAdapterProxy(app=${app},adapter=${adapter}): proxy → ${proxy}`, { "event.action": "createAdapterProxy", "logrite.app": app, "logrite.adapter": adapter });
    return proxy as unknown as T;
  }

  private createGraphInspector(
    appOptions: NestApplicationContextOptions,
    container: NestContainer,
  ) {
	logger.error(`>>> Entering createGraphInspector(appOptions=${appOptions},container=${container})`, { "event.action": "createGraphInspector", "logrite.appOptions": appOptions, "logrite.container": container });
    return appOptions?.snapshot
      ? new GraphInspector(container)
      : NoopGraphInspector;
	logger.warn(`<<< Exiting createGraphInspector(appOptions=${appOptions},container=${container})`, { "event.action": "createGraphInspector", "logrite.appOptions": appOptions, "logrite.container": container });
  }
}

/**
 * Use NestFactory to create an application instance.
 *
 * ### Specifying an entry module
 *
 * Pass the required *root module* for the application via the module parameter.
 * By convention, it is usually called `ApplicationModule`.  Starting with this
 * module, Nest assembles the dependency graph and begins the process of
 * Dependency Injection and instantiates the classes needed to launch your
 * application.
 *
 * @publicApi
 */
export const NestFactory = new NestFactoryStatic();
