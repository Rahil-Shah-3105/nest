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
	logger.debug(`>>> Entering create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options})`);
    const [httpServer, appOptions] = this.isHttpServer(serverOrOptions!)
      ? [serverOrOptions, options]
      : [await this.createHttpAdapter(), serverOrOptions];

    const applicationConfig = new ApplicationConfig();
	logger.debug(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): applicationConfig → ${applicationConfig}`);
    const container = new NestContainer(applicationConfig, appOptions);
	logger.debug(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): container → ${container}`);
    const graphInspector = this.createGraphInspector(appOptions!, container);
	logger.debug(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): graphInspector → ${graphInspector}`);

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
	logger.debug(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): instance → ${instance}`);
    const target = this.createNestInstance(instance);
	logger.debug(`create(moduleCls=${moduleCls},serverOrOptions=${serverOrOptions},options=${options}): target → ${target}`);
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
	logger.debug(`>>> Entering createMicroservice(moduleCls=${moduleCls},options=${options})`);
    const { NestMicroservice } = await loadPackage(
      '@nestjs/microservices',
      'NestFactory',
      () => import('@nestjs/microservices'),
    );
    const applicationConfig = new ApplicationConfig();
	logger.debug(`createMicroservice(moduleCls=${moduleCls},options=${options}): applicationConfig → ${applicationConfig}`);
    const container = new NestContainer(applicationConfig, options);
	logger.debug(`createMicroservice(moduleCls=${moduleCls},options=${options}): container → ${container}`);
    const graphInspector = this.createGraphInspector(options!, container);
	logger.debug(`createMicroservice(moduleCls=${moduleCls},options=${options}): graphInspector → ${graphInspector}`);

    this.setAbortOnError(options);
    this.registerLoggerConfiguration(options);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options,
    );
	logger.debug(`<<< Exiting createMicroservice(moduleCls=${moduleCls},options=${options})`);
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
    const applicationConfig = new ApplicationConfig();
	logger.debug(`createApplicationContext(moduleCls=${moduleCls},options=${options}): applicationConfig → ${applicationConfig}`);
    const container = new NestContainer(applicationConfig, options);
	logger.debug(`createApplicationContext(moduleCls=${moduleCls},options=${options}): container → ${container}`);
    const graphInspector = this.createGraphInspector(options!, container);
	logger.debug(`createApplicationContext(moduleCls=${moduleCls},options=${options}): graphInspector → ${graphInspector}`);

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
	logger.debug(`createApplicationContext(moduleCls=${moduleCls},options=${options}): modules → ${modules}`);
    const root = modules.next().value;

    const context = this.createNestInstance<NestApplicationContext>(
      new NestApplicationContext(container, options, root),
    );
    if (this.autoFlushLogs) {
	logger.debug(`>>> Entering createApplicationContext(moduleCls=${moduleCls},options=${options})`);
      context.flushLogsOnOverride();
    }
	logger.debug(`<<< Exiting createApplicationContext(moduleCls=${moduleCls},options=${options})`);
    return context.init();
  }

  private createNestInstance<T>(instance: T): T {
	logger.debug(`>>> Entering createNestInstance(instance=${instance})`);
	logger.debug(`<<< Exiting createNestInstance(instance=${instance})`);
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
	logger.debug(`>>> Entering handleInitializationError(err=${err})`);
    if (this.abortOnError) {
      process.abort();
    }
    rethrow(err);
	logger.debug(`<<< Exiting handleInitializationError(err=${err})`);
  }

  private createProxy(target: any) {
	logger.debug(`>>> Entering createProxy(target=${target})`);
    const proxy = this.createExceptionProxy();
	logger.debug(`<<< Exiting createProxy(target=${target})`);
    return new Proxy(target, {
      get: proxy,
      set: proxy,
    });
  }

  private createExceptionProxy() {
	logger.debug('>>> Entering createExceptionProxy()');
	logger.debug('<<< Exiting createExceptionProxy()');
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
    const teardown = this.abortOnError === false ? rethrow : undefined;

    return (...args: unknown[]) => {
	logger.debug(`>>> Entering createExceptionZone(receiver=${receiver},prop=${prop})`);
      let result: unknown;
      ExceptionsZone.run(
        () => {
          result = receiver[prop](...args);
        },
        teardown,
        this.autoFlushLogs,
      );

	logger.debug(`<<< Exiting createExceptionZone(receiver=${receiver},prop=${prop})`);
      return result;
    };
  }

  private registerLoggerConfiguration(
    options: NestApplicationContextOptions | undefined,
  ) {
	logger.debug(`>>> Entering registerLoggerConfiguration(options=${options})`);
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
	logger.debug(`registerLoggerConfiguration(options=${options}): consoleLogger → ${consoleLogger}`);
      Logger.overrideLogger(consoleLogger);
    }
    if (bufferLogs) {
      Logger.attachBuffer();
    }
    this.autoFlushLogs = autoFlushLogs ?? true;
	logger.debug(`registerLoggerConfiguration(options=${options}): this.autoFlushLogs → ${this.autoFlushLogs}`);
  }

  private async createHttpAdapter<T = any>(
    httpServer?: T,
  ): Promise<AbstractHttpAdapter> {
	logger.debug(`>>> Entering createHttpAdapter(httpServer=${httpServer})`);
    const { ExpressAdapter } = await loadAdapter(
      '@nestjs/platform-express',
      'HTTP',
      () => import('@nestjs/platform-express'),
    );
	logger.debug(`<<< Exiting createHttpAdapter(httpServer=${httpServer})`);
    return new ExpressAdapter(httpServer);
  }

  private isHttpServer(
    serverOrOptions: AbstractHttpAdapter | NestApplicationOptions,
  ): serverOrOptions is AbstractHttpAdapter {
	logger.debug(`>>> Entering isHttpServer(serverOrOptions=${serverOrOptions})`);
	logger.debug(`<<< Exiting isHttpServer(serverOrOptions=${serverOrOptions})`);
    return !!(
      serverOrOptions && (serverOrOptions as AbstractHttpAdapter).patch
    );
  }

  private setAbortOnError(
    serverOrOptions?: AbstractHttpAdapter | NestApplicationOptions,
    options?: NestApplicationContextOptions | NestApplicationOptions,
  ) {
	logger.debug(`>>> Entering setAbortOnError(serverOrOptions=${serverOrOptions},options=${options})`);
    this.abortOnError = this.isHttpServer(serverOrOptions!)
      ? !(options && options.abortOnError === false)
      : !(serverOrOptions && serverOrOptions.abortOnError === false);
	logger.debug(`<<< Exiting setAbortOnError(serverOrOptions=${serverOrOptions},options=${options})`);
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
    const proxy = new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
		logger.debug(`>>> Entering createAdapterProxy(app=${app},adapter=${adapter})`);
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
    return proxy as unknown as T;
  }

  private createGraphInspector(
    appOptions: NestApplicationContextOptions,
    container: NestContainer,
  ) {
	logger.debug(`>>> Entering createGraphInspector(appOptions=${appOptions},container=${container})`);
    return appOptions?.snapshot
      ? new GraphInspector(container)
      : NoopGraphInspector;
	logger.debug(`<<< Exiting createGraphInspector(appOptions=${appOptions},container=${container})`);
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
