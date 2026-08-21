import {
  type CanActivate,
  type ExceptionFilter,
  type HttpServer,
  type INestApplication,
  type INestMicroservice,
  type NestHybridApplicationOptions,
  type NestInterceptor,
  type PipeTransform,
  type VersioningOptions,
  VersioningType,
  type WebSocketAdapter,
} from '@nestjs/common';
import { iterate } from 'iterare';
import { platform } from 'os';
import { AbstractHttpAdapter } from './adapters/index.js';
import { ApplicationConfig } from './application-config.js';
import { MESSAGES } from './constants.js';
import { optionalRequire } from './helpers/optional-require.js';
import { NestContainer } from './injector/container.js';
import { Injector } from './injector/injector.js';
import { GraphInspector } from './inspector/graph-inspector.js';
import { MiddlewareContainer } from './middleware/container.js';
import { MiddlewareModule } from './middleware/middleware-module.js';
import { mapToExcludeRoute } from './middleware/utils.js';
import { NestApplicationContext } from './nest-application-context.js';
import { Resolver } from './router/interfaces/resolver.interface.js';
import { RoutesResolver } from './router/routes-resolver.js';
import { type NestApplicationOptions, Logger } from '@nestjs/common';
import {
  type GlobalPrefixOptions,
  loadPackage,
  loadPackageCached,
  tryLoadPackage,
  addLeadingSlash,
  isFunction,
  isObject,
  isString,
} from '@nestjs/common/internal';
import { ResolvedRoute } from './router/interfaces/resolved-route.interface.js';
import { RouteConflictDetector } from './router/route-conflict-detector.js';
import { RouteSpecificitySorter } from './router/route-specificity-sorter.js';

/**
 * @publicApi
 */
export class NestApplication
  extends NestApplicationContext<NestApplicationOptions>
  implements INestApplication
{
  protected readonly logger = new Logger(NestApplication.name, {
    timestamp: true,
  });
  private readonly middlewareModule: MiddlewareModule;
  private readonly middlewareContainer = new MiddlewareContainer(
    this.container,
  );
  private microservicesModule: any = null;
  private socketModule: any = null;
  private readonly routesResolver: Resolver;
  private readonly microservices: any[] = [];
  private httpServer: any;
  private isListening = false;
  private isWsModuleRegistered = false;

  constructor(
    container: NestContainer,
    private readonly httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly graphInspector: GraphInspector,
    appOptions: NestApplicationOptions = {},
  ) {
    super(container, appOptions);

    this.config.setRouteConflictPolicy(appOptions.routeConflictPolicy);
    this.config.setRouteResolutionStrategy(appOptions.routeResolutionStrategy);
    this.selectContextModule();
    this.registerHttpServer();
    this.injector = new Injector({
      preview: this.appOptions.preview!,
      instanceDecorator: appOptions.instrument?.instanceDecorator,
    });
    this.middlewareModule = new MiddlewareModule();
    this.routesResolver = new RoutesResolver(
      this.container,
      this.config,
      this.injector,
      this.graphInspector,
    );
  }

  protected async prepareClose(): Promise<void> {
	logger.debug('>>> Entering prepareClose()');
    this.httpAdapter && (await this.httpAdapter.beforeClose?.());
	logger.debug('<<< Exiting prepareClose()');
  }

  protected async dispose(): Promise<void> {
    await this.socketModule?.close();
    await this.microservicesModule?.close();
    await this.httpAdapter?.close();

    await Promise.all(
      iterate(this.microservices).map(async microservice => {
		logger.debug('>>> Entering dispose()');
        microservice.setIsTerminated(true);
        await microservice.close();
		logger.debug('<<< Exiting dispose()');
      }),
    );
  }

  public getHttpAdapter(): AbstractHttpAdapter {
	logger.debug('>>> Entering getHttpAdapter()');
	logger.debug('<<< Exiting getHttpAdapter()');
    return this.httpAdapter as AbstractHttpAdapter;
  }

  public registerHttpServer() {
	logger.debug('>>> Entering registerHttpServer()');
    this.httpServer = this.createServer();
	logger.debug('<<< Exiting registerHttpServer()');
  }

  public getUnderlyingHttpServer<T>(): T {
	logger.debug('>>> Entering getUnderlyingHttpServer()');
	logger.debug('<<< Exiting getUnderlyingHttpServer()');
    return this.httpAdapter.getHttpServer();
  }

  public applyOptions() {
	logger.debug('>>> Entering applyOptions()');
    if (!this.appOptions || !this.appOptions.cors) {
      return undefined;
    }
    const passCustomOptions =
      isObject(this.appOptions.cors) || isFunction(this.appOptions.cors);
    if (!passCustomOptions) {
	logger.debug('<<< Exiting applyOptions()');
      return this.enableCors();
    }
    return this.enableCors(this.appOptions.cors);
  }

  public createServer<T = any>(): T {
	logger.debug('>>> Entering createServer()');
    this.httpAdapter.initHttpServer(this.appOptions);
	logger.debug('<<< Exiting createServer()');
    return this.httpAdapter.getHttpServer() as T;
  }

  public async registerModules() {
	logger.debug('>>> Entering registerModules()');
    await this.registerWsModule();

    if (this.microservicesModule) {
      this.microservicesModule.register(
        this.container,
        this.graphInspector,
        this.config,
        this.appOptions,
      );
      this.microservicesModule.setupClients(this.container);
	logger.debug('<<< Exiting registerModules()');
    }

    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
      this.injector,
      this.httpAdapter,
      this.graphInspector,
      this.appOptions,
    );
  }

  public async registerWsModule() {
	logger.debug('>>> Entering registerWsModule()');
    if (!this.socketModule) {
      return;
    }
    await this.socketModule.register(
      this.container,
      this.config,
      this.graphInspector,
      this.appOptions,
      this.httpServer,
    );
    this.isWsModuleRegistered = true;
	logger.debug(`registerWsModule(): this.isWsModuleRegistered → ${this.isWsModuleRegistered}`);
  }

  public async init(): Promise<this> {
    if (this.isInitialized) {
	logger.debug('>>> Entering init()');
      return this;
    }

    // Lazy-load optional modules (ESM-compatible)
    await Promise.all([
      this.loadSocketModule(),
      this.loadMicroservicesModule(),
    ]);
    this.applyOptions();
    await this.httpAdapter?.init?.();

    const useBodyParser =
      this.appOptions && this.appOptions.bodyParser !== false;
    useBodyParser && this.registerParserMiddleware();

    await this.registerModules();
    await this.registerRouter();
    await this.callInitHook();
    await this.registerRouterHooks();
    await this.callBootstrapHook();

    this.isInitialized = true;
    this.logger.log(MESSAGES.APPLICATION_READY);
	logger.debug(`init(): this.isInitialized → ${this.isInitialized}`);
	logger.debug('<<< Exiting init()');
    return this;
  }

  public registerParserMiddleware() {
	logger.debug('>>> Entering registerParserMiddleware()');
    const prefix = this.config.getGlobalPrefix();
    const rawBody = !!this.appOptions?.rawBody;
	logger.debug(`registerParserMiddleware(): prefix → ${prefix}`);
    this.httpAdapter.registerParserMiddleware(prefix, rawBody);
	logger.debug('<<< Exiting registerParserMiddleware()');
  }

  public async registerRouter() {
	logger.debug('>>> Entering registerRouter()');
    await this.registerMiddleware(this.httpAdapter);

    const prefix = this.config.getGlobalPrefix();
	logger.debug(`registerRouter(): prefix → ${prefix}`);
    const basePath = addLeadingSlash(prefix);
	logger.debug(`registerRouter(): basePath → ${basePath}`);

    const conflictPolicy = this.config.getRouteConflictPolicy();
	logger.debug(`registerRouter(): conflictPolicy → ${conflictPolicy}`);
    const resolutionStrategy = this.config.getRouteResolutionStrategy();
	logger.debug(`registerRouter(): resolutionStrategy → ${resolutionStrategy}`);
    const adapterIsOrderSensitive =
      this.httpAdapter.isRouteOrderSensitive?.() ?? true;
    const shouldSortBySpecificity =
      resolutionStrategy === 'specificity' && adapterIsOrderSensitive;
    // Adapters that are not order-sensitive (e.g. Fastify) currently
    // also reject duplicate (method, URL) registrations synchronously
    // from the underlying router. Treat the two properties as one
    // signal until a separate capability flag is introduced.
    const adapterRejectsDuplicates = !adapterIsOrderSensitive;

    if (!conflictPolicy && !shouldSortBySpecificity) {
      this.routesResolver.resolve(this.httpAdapter, basePath);
      return;
    }

    // Defer registration whenever we collect routes for diagnostics or
    // re-ordering. In particular, when a conflict policy is set we
    // must run detection *before* the adapter sees any route, because
    // duplicate-rejecting adapters like Fastify throw synchronously
    // from `instance.route()` and would short-circuit both the resolve
    // loop and the aggregated `RouteConflictException`.
    const resolvedRoutes: ResolvedRoute[] = [];
    this.routesResolver.resolve(this.httpAdapter, basePath, {
      onRouteResolved: route => resolvedRoutes.push(route),
      deferRegistration: true,
    });

    // Sort before conflict detection so that winner/shadowed pairs in every
    // conflict record reflect actual adapter registration order. Without this,
    // the reported winner could be the declaration-first (less-specific) route
    // even though the sorted-first (more-specific) route is what really wins.
    const orderedRoutes = shouldSortBySpecificity
      ? RouteSpecificitySorter.sort(resolvedRoutes)
      : resolvedRoutes;

    const routesToSkip = new Set<ResolvedRoute>();
	logger.debug(`registerRouter(): routesToSkip → ${routesToSkip}`);
    if (conflictPolicy) {
      const filteredPolicy = adapterIsOrderSensitive
        ? conflictPolicy
        : { duplicate: conflictPolicy.duplicate };

      const conflicts = RouteConflictDetector.detect(
        orderedRoutes,
        this.config.getVersioning(),
      );

      // On adapters that reject duplicate registrations the policy
      // cannot be honoured by simply logging — the adapter would
      // throw on the second `instance.route()` call. Drop the
      // shadowed route of every duplicate conflict so the detector
      // (not the adapter) decides which one wins. The detector
      // always picks the earlier-registered route as the winner.
      if (adapterRejectsDuplicates) {
        conflicts.forEach(conflict => {
          if (conflict.kind === 'duplicate') {
            routesToSkip.add(conflict.shadowed);
          }
        });
      }

      // When specificity sorting is active, shadow conflicts where the sort
      // promoted the winner (declared later but more specific) are resolved
      // at runtime: the more-specific route is first-registered and handles
      // its requests, the less-specific route handles the rest. Filtering
      // these out prevents shadow: 'error' from aborting an app whose routes
      // work correctly after specificity ordering. Genuine shadows — where the
      // winner was already first in declaration order and the sort did not help
      // — are kept and still apply the configured policy.
      const effectiveConflicts = shouldSortBySpecificity
        ? RouteConflictDetector.filterSortResolvedShadows(
            conflicts,
            resolvedRoutes,
          )
        : conflicts;

      RouteConflictDetector.handle(
        effectiveConflicts,
        filteredPolicy,
        this.logger,
      );
    }

    orderedRoutes.forEach(route => {
      if (routesToSkip.has(route)) return;
      this.routesResolver.registerResolvedRoute(this.httpAdapter, route);
    });
	logger.debug('<<< Exiting registerRouter()');
  }

  public async registerRouterHooks() {
	logger.debug('>>> Entering registerRouterHooks()');
    this.routesResolver.registerNotFoundHandler();
    this.routesResolver.registerExceptionHandler();
	logger.debug('<<< Exiting registerRouterHooks()');
  }

  public connectMicroservice<T extends object>(
    microserviceOptions: T,
    hybridAppOptions: NestHybridApplicationOptions = {},
  ): INestMicroservice {
    const { NestMicroservice } = loadPackageCached(
      '@nestjs/microservices',
      'NestFactory',
    );
    const { inheritAppConfig } = hybridAppOptions;
    const applicationConfig = inheritAppConfig
      ? this.config
      : new ApplicationConfig();

    const instance = new NestMicroservice(
      this.container,
      microserviceOptions,
      this.graphInspector,
      applicationConfig,
    );

	logger.debug(`connectMicroservice(microserviceOptions=${microserviceOptions},hybridAppOptions=${hybridAppOptions}): instance → ${instance}`);
    if (!hybridAppOptions.deferInitialization) {
	logger.debug(`>>> Entering connectMicroservice(microserviceOptions=${microserviceOptions},hybridAppOptions=${hybridAppOptions})`);
      instance.registerListeners();
      instance.setIsInitialized(true);
      instance.setIsInitHookCalled(true);
    }

    this.microservices.push(instance);
	logger.debug(`<<< Exiting connectMicroservice(microserviceOptions=${microserviceOptions},hybridAppOptions=${hybridAppOptions})`);
    return instance;
  }

  public getMicroservices(): INestMicroservice[] {
	logger.debug('>>> Entering getMicroservices()');
	logger.debug('<<< Exiting getMicroservices()');
    return this.microservices;
  }

  public getHttpServer() {
	logger.debug('>>> Entering getHttpServer()');
	logger.debug('<<< Exiting getHttpServer()');
    return this.httpServer;
  }

  public async startAllMicroservices(): Promise<this> {
	logger.debug('>>> Entering startAllMicroservices()');
    this.assertNotInPreviewMode('startAllMicroservices');
    await Promise.all(this.microservices.map(msvc => msvc.listen()));
	logger.debug('<<< Exiting startAllMicroservices()');
    return this;
  }

  public use(...args: [any, any?]): this {
	logger.debug(`>>> Entering use(args=${args})`);
    this.httpAdapter.use(...this.applyFunctionDecoratorIfRegistered(args));
	logger.debug(`<<< Exiting use(args=${args})`);
    return this;
  }

  public useBodyParser(...args: [any, any?]): this {
    if (!('useBodyParser' in this.httpAdapter)) {
	logger.debug(`>>> Entering useBodyParser(args=${args})`);
      this.logger.warn('Your HTTP Adapter does not support `.useBodyParser`.');
      return this;
    }

    const [parserType, ...otherArgs] = args;
    const rawBody = !!this.appOptions.rawBody;

    this.httpAdapter.useBodyParser?.(...[parserType, rawBody, ...otherArgs]);

	logger.debug(`<<< Exiting useBodyParser(args=${args})`);
    return this;
  }

  public enableCors(options?: any): void {
	logger.debug(`>>> Entering enableCors(options=${options})`);
    this.httpAdapter.enableCors(options);
	logger.debug(`<<< Exiting enableCors(options=${options})`);
  }

  public enableVersioning(
    options: VersioningOptions = { type: VersioningType.URI },
  ): this {
	logger.debug(`>>> Entering enableVersioning(options=${options})`);
    this.config.enableVersioning(options);
	logger.debug(`<<< Exiting enableVersioning(options=${options})`);
    return this;
  }

  public async listen(port: number | string): Promise<any>;
  public async listen(port: number | string, hostname: string): Promise<any>;
  public async listen(port: number | string, ...args: any[]): Promise<any> {
    this.assertNotInPreviewMode('listen');

    if (!this.isInitialized) {
	logger.debug(`>>> Entering listen(port=${port},args=${args})`);
      await this.init();
    }

    const httpAdapterHost = this.container.getHttpAdapterHostRef();
	logger.debug(`listen(port=${port},args=${args}): httpAdapterHost → ${httpAdapterHost}`);
	logger.debug(`<<< Exiting listen(port=${port},args=${args})`);
    return new Promise((resolve, reject) => {
      const errorHandler = (e: any) => {
		logger.debug(`>>> Entering errorHandler(e=${e})`);
        this.logger.error(e?.toString?.());
        reject(e);
		logger.debug(`<<< Exiting errorHandler(e=${e})`);
      };
      this.httpServer.once('error', errorHandler);

      const isCallbackInOriginalArgs = isFunction(args[args.length - 1]);
	logger.debug(`listen(port=${port},args=${args}): isCallbackInOriginalArgs → ${isCallbackInOriginalArgs}`);
      const listenFnArgs = isCallbackInOriginalArgs
        ? args.slice(0, args.length - 1)
        : args;

      this.httpAdapter.listen(
        port,
        ...listenFnArgs,
        (...originalCallbackArgs: unknown[]) => {
          if (this.appOptions?.autoFlushLogs ?? true) {
            this.flushLogs();
          }
          if (originalCallbackArgs[0] instanceof Error) {
            return reject(originalCallbackArgs[0]);
          }

          const address = this.httpServer.address();
          if (address) {
            this.httpServer.removeListener('error', errorHandler);
            this.isListening = true;

			logger.debug(`listen(port=${port},args=${args}): this.isListening → ${this.isListening}`);
            httpAdapterHost.listening = true;
            resolve(this.httpServer);
          }
          if (isCallbackInOriginalArgs) {
            args[args.length - 1](...originalCallbackArgs);
          }
        },
      );
    });
  }

  public async getUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
	logger.debug('>>> Entering getUrl()');
      if (!this.isListening) {
        this.logger.error(MESSAGES.CALL_LISTEN_FIRST);
        reject(MESSAGES.CALL_LISTEN_FIRST);
        return;
      }
      const address = this.httpServer.address();
	logger.debug(`getUrl(): address → ${address}`);
      resolve(this.formatAddress(address));
    });
	logger.debug('<<< Exiting getUrl()');
  }

  private formatAddress(address: any): string {
    if (isString(address)) {
	logger.debug(`>>> Entering formatAddress(address=${address})`);
      if (platform() === 'win32') {
        return address;
      }
      const basePath = encodeURIComponent(address);
	logger.debug(`formatAddress(address=${address}): basePath → ${basePath}`);
      return `${this.getProtocol()}+unix://${basePath}`;
    }

    let host = this.host();
    if (address && address.family === 'IPv6') {
      if (host === '::') {
        host = '[::1]';
      } else {
        host = `[${host}]`;
      }
    } else if (host === '0.0.0.0') {
      host = '127.0.0.1';
	logger.debug('>>> Entering host()');
	logger.debug('<<< Exiting host()');
    }

	logger.debug(`<<< Exiting formatAddress(address=${address})`);
    return `${this.getProtocol()}://${host}:${address.port}`;
  }

  public setGlobalPrefix(prefix: string, options?: GlobalPrefixOptions): this {
    this.config.setGlobalPrefix(prefix);
    if (options) {
	logger.debug(`>>> Entering setGlobalPrefix(prefix=${prefix},options=${options})`);
      const exclude = options?.exclude
        ? mapToExcludeRoute(options.exclude)
        : [];
      this.config.setGlobalPrefixOptions({
        ...options,
        exclude,
      });
    }
	logger.debug(`<<< Exiting setGlobalPrefix(prefix=${prefix},options=${options})`);
    return this;
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    if (this.isWsModuleRegistered) {
	logger.debug(`>>> Entering useWebSocketAdapter(adapter=${adapter})`);
      this.logger.warn(
        'useWebSocketAdapter() was called after WebSocket gateways were already initialized. The provided adapter will be stored but will NOT be applied to existing gateways — they remain bound to the previously installed adapter. To install a custom adapter, call app.useWebSocketAdapter(...) BEFORE app.init() (or app.listen()).',
      );
    }
    this.config.setIoAdapter(adapter);
	logger.debug(`<<< Exiting useWebSocketAdapter(adapter=${adapter})`);
    return this;
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
	logger.debug(`>>> Entering useGlobalFilters(filters=${filters})`);
    filters = this.applyInstanceDecoratorIfRegistered<ExceptionFilter>(
      ...filters,
    );
    this.config.useGlobalFilters(...filters);
    filters.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'filter',
        ref: item,
      }),
    );
	logger.debug(`<<< Exiting useGlobalFilters(filters=${filters})`);
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
	logger.debug(`>>> Entering useGlobalPipes(pipes=${pipes})`);
    pipes = this.applyInstanceDecoratorIfRegistered<PipeTransform<any>>(
      ...pipes,
    );
    this.config.useGlobalPipes(...pipes);
    pipes.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'pipe',
        ref: item,
      }),
    );
	logger.debug(`<<< Exiting useGlobalPipes(pipes=${pipes})`);
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
	logger.debug(`>>> Entering useGlobalInterceptors(interceptors=${interceptors})`);
    interceptors = this.applyInstanceDecoratorIfRegistered<NestInterceptor>(
      ...interceptors,
    );
    this.config.useGlobalInterceptors(...interceptors);
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
	logger.debug(`>>> Entering useGlobalGuards(guards=${guards})`);
    guards = this.applyInstanceDecoratorIfRegistered<CanActivate>(...guards);
    this.config.useGlobalGuards(...guards);
    guards.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'guard',
        ref: item,
      }),
    );
	logger.debug(`useGlobalGuards(guards=${guards}): guards → ${guards}`);
    return this;
  }

  public useStaticAssets(options: any): this;
  public useStaticAssets(path: string, options?: any): this;
  public useStaticAssets(pathOrOptions: any, options?: any): this {
	logger.debug(`>>> Entering useStaticAssets(pathOrOptions=${pathOrOptions},options=${options})`);
    this.httpAdapter.useStaticAssets?.(pathOrOptions, options);
	logger.debug(`<<< Exiting useStaticAssets(pathOrOptions=${pathOrOptions},options=${options})`);
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
	logger.debug(`>>> Entering setBaseViewsDir(path=${path})`);
    this.httpAdapter.setBaseViewsDir?.(path);
	logger.debug(`<<< Exiting setBaseViewsDir(path=${path})`);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
	logger.debug(`>>> Entering setViewEngine(engineOrOptions=${engineOrOptions})`);
    this.httpAdapter.setViewEngine?.(engineOrOptions);
	logger.debug(`<<< Exiting setViewEngine(engineOrOptions=${engineOrOptions})`);
    return this;
  }

  /**
   * Pre-load optional packages so that createNestApplication,
   * createNestMicroservice and createHttpAdapter can stay synchronous.
   */
  public async preloadLazyPackages(): Promise<void> {
	logger.debug('>>> Entering preloadLazyPackages()');
    // Best-effort: silently swallow if packages are not installed
    await tryLoadPackage(
      '@nestjs/platform-express',
      () => import('@nestjs/platform-express'),
    );
    await tryLoadPackage(
      '@nestjs/microservices',
      () => import('@nestjs/microservices'),
    );
	logger.debug('<<< Exiting preloadLazyPackages()');
  }

  private host(): string | undefined {
    const address = this.httpServer.address();
	logger.debug(`host(): address → ${address}`);
    if (isString(address)) {
      return undefined;
    }
    return address && address.address;
  }

  private getProtocol(): 'http' | 'https' {
	logger.debug('>>> Entering getProtocol()');
	logger.debug('<<< Exiting getProtocol()');
    return this.appOptions && this.appOptions.httpsOptions ? 'https' : 'http';
  }

  private async registerMiddleware(instance: any) {
	logger.debug(`>>> Entering registerMiddleware(instance=${instance})`);
    await this.middlewareModule.registerMiddleware(
      this.middlewareContainer,
      instance,
    );
	logger.debug(`<<< Exiting registerMiddleware(instance=${instance})`);
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

  private applyFunctionDecoratorIfRegistered(args: [any, any?]): [any, any?] {
    if (!this.appOptions.instrument?.instanceDecorator) {
	logger.debug(`>>> Entering applyFunctionDecoratorIfRegistered(args=${args})`);
      return args;
    }
    const [firstArg, secondArg] = args;

	logger.debug(`<<< Exiting applyFunctionDecoratorIfRegistered(args=${args})`);
    return [
      isFunction(firstArg)
        ? this.appOptions.instrument.instanceDecorator(firstArg)
        : firstArg,
      isFunction(secondArg)
        ? this.appOptions.instrument.instanceDecorator(secondArg)
        : secondArg,
    ];
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

  private async loadMicroservicesModule() {
	logger.debug('>>> Entering loadMicroservicesModule()');
    if (!this.microservicesModule) {
      const msModule = await optionalRequire(
        '@nestjs/microservices/microservices-module',
        () => import('@nestjs/microservices/microservices-module.js'),
      );
      if (msModule?.MicroservicesModule) {
        this.microservicesModule = new msModule.MicroservicesModule();
		logger.debug('<<< Exiting loadMicroservicesModule()');
        // Pre-cache the main barrel so connectMicroservice() can stay synchronous
        await loadPackage(
          '@nestjs/microservices',
          'NestFactory',
          () => import('@nestjs/microservices'),
        );
      }
    }
  }
}
