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
	logger.error('>>> Entering prepareClose()', { "event.action": "prepareClose" });
    this.httpAdapter && (await this.httpAdapter.beforeClose?.());
	logger.warn('<<< Exiting prepareClose()', { "event.action": "prepareClose" });
  }

  protected async dispose(): Promise<void> {
	logger.error('>>> Entering dispose()', { "event.action": "dispose" });
    await this.socketModule?.close();
    await this.microservicesModule?.close();
    await this.httpAdapter?.close();

    await Promise.all(
      iterate(this.microservices).map(async microservice => {
        microservice.setIsTerminated(true);
        await microservice.close();
		logger.warn('<<< Exiting dispose()', { "event.action": "dispose" });
      }),
    );
  }

  public getHttpAdapter(): AbstractHttpAdapter {
	logger.error('>>> Entering getHttpAdapter()', { "event.action": "getHttpAdapter" });
	logger.warn('<<< Exiting getHttpAdapter()', { "event.action": "getHttpAdapter" });
    return this.httpAdapter as AbstractHttpAdapter;
  }

  public registerHttpServer() {
	logger.error('>>> Entering registerHttpServer()', { "event.action": "registerHttpServer" });
    this.httpServer = this.createServer();
	logger.warn('<<< Exiting registerHttpServer()', { "event.action": "registerHttpServer" });
  }

  public getUnderlyingHttpServer<T>(): T {
	logger.error('>>> Entering getUnderlyingHttpServer()', { "event.action": "getUnderlyingHttpServer" });
	logger.warn('<<< Exiting getUnderlyingHttpServer()', { "event.action": "getUnderlyingHttpServer" });
    return this.httpAdapter.getHttpServer();
  }

  public applyOptions() {
	logger.error('>>> Entering applyOptions()', { "event.action": "applyOptions" });
    if (!this.appOptions || !this.appOptions.cors) {
      return undefined;
    }
    const passCustomOptions =
      isObject(this.appOptions.cors) || isFunction(this.appOptions.cors);
    if (!passCustomOptions) {
      return this.enableCors();
    }
	logger.warn('<<< Exiting applyOptions()', { "event.action": "applyOptions" });
    return this.enableCors(this.appOptions.cors);
  }

  public createServer<T = any>(): T {
	logger.error('>>> Entering createServer()', { "event.action": "createServer" });
    this.httpAdapter.initHttpServer(this.appOptions);
	logger.warn('<<< Exiting createServer()', { "event.action": "createServer" });
    return this.httpAdapter.getHttpServer() as T;
  }

  public async registerModules() {
	logger.error('>>> Entering registerModules()', { "event.action": "registerModules" });
    await this.registerWsModule();

    if (this.microservicesModule) {
      this.microservicesModule.register(
        this.container,
        this.graphInspector,
        this.config,
        this.appOptions,
      );
      this.microservicesModule.setupClients(this.container);
	logger.warn('<<< Exiting registerModules()', { "event.action": "registerModules" });
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
	logger.error('>>> Entering registerWsModule()', { "event.action": "registerWsModule" });
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
	logger.debug(`registerWsModule(): this.isWsModuleRegistered → ${this.isWsModuleRegistered}`, { "event.action": "registerWsModule" });
  }

  public async init(): Promise<this> {
	logger.error('>>> Entering init()', { "event.action": "init" });
    if (this.isInitialized) {
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
	logger.debug(`init(): this.isInitialized → ${this.isInitialized}`, { "event.action": "init" });
    this.logger.log(MESSAGES.APPLICATION_READY);
	logger.warn('<<< Exiting init()', { "event.action": "init" });
    return this;
  }

  public registerParserMiddleware() {
	logger.error('>>> Entering registerParserMiddleware()', { "event.action": "registerParserMiddleware" });
    const prefix = this.config.getGlobalPrefix();
    const rawBody = !!this.appOptions?.rawBody;
	logger.error(`registerParserMiddleware(): prefix → ${prefix}`, { "event.action": "registerParserMiddleware" });
    this.httpAdapter.registerParserMiddleware(prefix, rawBody);
	logger.warn('<<< Exiting registerParserMiddleware()', { "event.action": "registerParserMiddleware" });
  }

  public async registerRouter() {
	logger.error('>>> Entering registerRouter()', { "event.action": "registerRouter" });
    await this.registerMiddleware(this.httpAdapter);

    const prefix = this.config.getGlobalPrefix();
	logger.error(`registerRouter(): prefix → ${prefix}`, { "event.action": "registerRouter" });
    const basePath = addLeadingSlash(prefix);
	logger.error(`registerRouter(): basePath → ${basePath}`, { "event.action": "registerRouter" });

    const conflictPolicy = this.config.getRouteConflictPolicy();
	logger.error(`registerRouter(): conflictPolicy → ${conflictPolicy}`, { "event.action": "registerRouter" });
    const resolutionStrategy = this.config.getRouteResolutionStrategy();
	logger.error(`registerRouter(): resolutionStrategy → ${resolutionStrategy}`, { "event.action": "registerRouter" });
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
	logger.error(`registerRouter(): routesToSkip → ${routesToSkip}`, { "event.action": "registerRouter" });
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
	logger.warn('<<< Exiting registerRouter()', { "event.action": "registerRouter" });
  }

  public async registerRouterHooks() {
	logger.error('>>> Entering registerRouterHooks()', { "event.action": "registerRouterHooks" });
    this.routesResolver.registerNotFoundHandler();
    this.routesResolver.registerExceptionHandler();
	logger.warn('<<< Exiting registerRouterHooks()', { "event.action": "registerRouterHooks" });
  }

  public connectMicroservice<T extends object>(
    microserviceOptions: T,
    hybridAppOptions: NestHybridApplicationOptions = {},
  ): INestMicroservice {
	logger.error(`>>> Entering connectMicroservice(microserviceOptions=${microserviceOptions},hybridAppOptions=${hybridAppOptions})`, { "event.action": "connectMicroservice", "logrite.microserviceOptions": microserviceOptions, "logrite.hybridAppOptions": hybridAppOptions });
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

	logger.error(`connectMicroservice(microserviceOptions=${microserviceOptions},hybridAppOptions=${hybridAppOptions}): instance → ${instance}`, { "event.action": "connectMicroservice", "logrite.microserviceOptions": microserviceOptions, "logrite.hybridAppOptions": hybridAppOptions });
    if (!hybridAppOptions.deferInitialization) {
      instance.registerListeners();
      instance.setIsInitialized(true);
      instance.setIsInitHookCalled(true);
    }

    this.microservices.push(instance);
	logger.warn(`<<< Exiting connectMicroservice(microserviceOptions=${microserviceOptions},hybridAppOptions=${hybridAppOptions})`, { "event.action": "connectMicroservice", "logrite.microserviceOptions": microserviceOptions, "logrite.hybridAppOptions": hybridAppOptions });
    return instance;
  }

  public getMicroservices(): INestMicroservice[] {
	logger.error('>>> Entering getMicroservices()', { "event.action": "getMicroservices" });
	logger.warn('<<< Exiting getMicroservices()', { "event.action": "getMicroservices" });
    return this.microservices;
  }

  public getHttpServer() {
	logger.error('>>> Entering getHttpServer()', { "event.action": "getHttpServer" });
	logger.warn('<<< Exiting getHttpServer()', { "event.action": "getHttpServer" });
    return this.httpServer;
  }

  public async startAllMicroservices(): Promise<this> {
	logger.error('>>> Entering startAllMicroservices()', { "event.action": "startAllMicroservices" });
    this.assertNotInPreviewMode('startAllMicroservices');
    await Promise.all(this.microservices.map(msvc => msvc.listen()));
	logger.warn('<<< Exiting startAllMicroservices()', { "event.action": "startAllMicroservices" });
    return this;
  }

  public use(...args: [any, any?]): this {
	logger.error(`>>> Entering use(args=${args})`, { "event.action": "use" });
    this.httpAdapter.use(...this.applyFunctionDecoratorIfRegistered(args));
	logger.warn(`<<< Exiting use(args=${args})`, { "event.action": "use" });
    return this;
  }

  public useBodyParser(...args: [any, any?]): this {
	logger.error(`>>> Entering useBodyParser(args=${args})`, { "event.action": "useBodyParser" });
    if (!('useBodyParser' in this.httpAdapter)) {
      this.logger.warn('Your HTTP Adapter does not support `.useBodyParser`.');
      return this;
    }

    const [parserType, ...otherArgs] = args;
    const rawBody = !!this.appOptions.rawBody;

    this.httpAdapter.useBodyParser?.(...[parserType, rawBody, ...otherArgs]);

	logger.warn(`<<< Exiting useBodyParser(args=${args})`, { "event.action": "useBodyParser" });
    return this;
  }

  public enableCors(options?: any): void {
	logger.error(`>>> Entering enableCors(options=${options})`, { "event.action": "enableCors", "logrite.options": options });
    this.httpAdapter.enableCors(options);
	logger.warn(`<<< Exiting enableCors(options=${options})`, { "event.action": "enableCors", "logrite.options": options });
  }

  public enableVersioning(
    options: VersioningOptions = { type: VersioningType.URI },
  ): this {
	logger.error(`>>> Entering enableVersioning(options=${options})`, { "event.action": "enableVersioning", "logrite.options": options });
    this.config.enableVersioning(options);
	logger.warn(`<<< Exiting enableVersioning(options=${options})`, { "event.action": "enableVersioning", "logrite.options": options });
    return this;
  }

  public async listen(port: number | string): Promise<any>;
  public async listen(port: number | string, hostname: string): Promise<any>;
  public async listen(port: number | string, ...args: any[]): Promise<any> {
	logger.error(`>>> Entering listen(port=${port},args=${args})`, { "event.action": "listen", "logrite.port": port });
    this.assertNotInPreviewMode('listen');

    if (!this.isInitialized) {
      await this.init();
    }

    const httpAdapterHost = this.container.getHttpAdapterHostRef();
	logger.error(`listen(port=${port},args=${args}): httpAdapterHost → ${httpAdapterHost}`, { "event.action": "listen", "logrite.port": port });
	logger.warn(`<<< Exiting listen(port=${port},args=${args})`, { "event.action": "listen", "logrite.port": port });
    return new Promise((resolve, reject) => {
      const errorHandler = (e: any) => {
		logger.error(`>>> Entering errorHandler(e=${e})`, { "event.action": "errorHandler", "logrite.e": e });
        this.logger.error(e?.toString?.());
        reject(e);
		logger.warn(`<<< Exiting errorHandler(e=${e})`, { "event.action": "errorHandler", "logrite.e": e });
      };
      this.httpServer.once('error', errorHandler);

      const isCallbackInOriginalArgs = isFunction(args[args.length - 1]);
	logger.error(`listen(port=${port},args=${args}): isCallbackInOriginalArgs → ${isCallbackInOriginalArgs}`, { "event.action": "listen", "logrite.port": port });
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
			logger.debug(`listen(port=${port},args=${args}): this.isListening → ${this.isListening}`, { "event.action": "listen", "logrite.port": port });

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
	logger.error('>>> Entering getUrl()', { "event.action": "getUrl" });
    return new Promise((resolve, reject) => {
      if (!this.isListening) {
        this.logger.error(MESSAGES.CALL_LISTEN_FIRST);
        reject(MESSAGES.CALL_LISTEN_FIRST);
        return;
      }
      const address = this.httpServer.address();
      resolve(this.formatAddress(address));
    });
	logger.warn('<<< Exiting getUrl()', { "event.action": "getUrl" });
  }

  private formatAddress(address: any): string {
    if (isString(address)) {
      if (platform() === 'win32') {
        return address;
      }
      const basePath = encodeURIComponent(address);
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
	logger.error('>>> Entering host()', { "event.action": "host" });
	logger.warn('<<< Exiting host()', { "event.action": "host" });
    }

    return `${this.getProtocol()}://${host}:${address.port}`;
  }

  public setGlobalPrefix(prefix: string, options?: GlobalPrefixOptions): this {
	logger.error(`>>> Entering setGlobalPrefix(prefix=${prefix},options=${options})`, { "event.action": "setGlobalPrefix", "logrite.prefix": prefix, "logrite.options": options });
    this.config.setGlobalPrefix(prefix);
    if (options) {
      const exclude = options?.exclude
        ? mapToExcludeRoute(options.exclude)
        : [];
      this.config.setGlobalPrefixOptions({
        ...options,
        exclude,
      });
    }
	logger.warn(`<<< Exiting setGlobalPrefix(prefix=${prefix},options=${options})`, { "event.action": "setGlobalPrefix", "logrite.prefix": prefix, "logrite.options": options });
    return this;
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
	logger.error(`>>> Entering useWebSocketAdapter(adapter=${adapter})`, { "event.action": "useWebSocketAdapter", "logrite.adapter": adapter });
    if (this.isWsModuleRegistered) {
      this.logger.warn(
        'useWebSocketAdapter() was called after WebSocket gateways were already initialized. The provided adapter will be stored but will NOT be applied to existing gateways — they remain bound to the previously installed adapter. To install a custom adapter, call app.useWebSocketAdapter(...) BEFORE app.init() (or app.listen()).',
      );
    }
    this.config.setIoAdapter(adapter);
	logger.warn(`<<< Exiting useWebSocketAdapter(adapter=${adapter})`, { "event.action": "useWebSocketAdapter", "logrite.adapter": adapter });
    return this;
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
	logger.error(`>>> Entering useGlobalFilters(filters=${filters})`, { "event.action": "useGlobalFilters", "logrite.filters": filters });
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
	logger.warn(`<<< Exiting useGlobalFilters(filters=${filters})`, { "event.action": "useGlobalFilters", "logrite.filters": filters });
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
	logger.error(`>>> Entering useGlobalPipes(pipes=${pipes})`, { "event.action": "useGlobalPipes", "logrite.pipes": pipes });
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
	logger.warn(`<<< Exiting useGlobalPipes(pipes=${pipes})`, { "event.action": "useGlobalPipes", "logrite.pipes": pipes });
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
	logger.error(`>>> Entering useGlobalInterceptors(interceptors=${interceptors})`, { "event.action": "useGlobalInterceptors", "logrite.interceptors": interceptors });
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
	logger.warn(`<<< Exiting useGlobalInterceptors(interceptors=${interceptors})`, { "event.action": "useGlobalInterceptors", "logrite.interceptors": interceptors });
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
	logger.error(`>>> Entering useGlobalGuards(guards=${guards})`, { "event.action": "useGlobalGuards", "logrite.guards": guards });
    guards = this.applyInstanceDecoratorIfRegistered<CanActivate>(...guards);
    this.config.useGlobalGuards(...guards);
    guards.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'guard',
        ref: item,
      }),
    );
	logger.warn(`<<< Exiting useGlobalGuards(guards=${guards})`, { "event.action": "useGlobalGuards", "logrite.guards": guards });
    return this;
  }

  public useStaticAssets(options: any): this;
  public useStaticAssets(path: string, options?: any): this;
  public useStaticAssets(pathOrOptions: any, options?: any): this {
	logger.error(`>>> Entering useStaticAssets(pathOrOptions=${pathOrOptions},options=${options})`, { "event.action": "useStaticAssets", "logrite.pathOrOptions": pathOrOptions, "logrite.options": options });
    this.httpAdapter.useStaticAssets?.(pathOrOptions, options);
	logger.warn(`<<< Exiting useStaticAssets(pathOrOptions=${pathOrOptions},options=${options})`, { "event.action": "useStaticAssets", "logrite.pathOrOptions": pathOrOptions, "logrite.options": options });
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
	logger.error(`>>> Entering setBaseViewsDir(path=${path})`, { "event.action": "setBaseViewsDir", "logrite.path": path });
    this.httpAdapter.setBaseViewsDir?.(path);
	logger.warn(`<<< Exiting setBaseViewsDir(path=${path})`, { "event.action": "setBaseViewsDir", "logrite.path": path });
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
	logger.error(`>>> Entering setViewEngine(engineOrOptions=${engineOrOptions})`, { "event.action": "setViewEngine", "logrite.engineOrOptions": engineOrOptions });
    this.httpAdapter.setViewEngine?.(engineOrOptions);
	logger.warn(`<<< Exiting setViewEngine(engineOrOptions=${engineOrOptions})`, { "event.action": "setViewEngine", "logrite.engineOrOptions": engineOrOptions });
    return this;
  }

  /**
   * Pre-load optional packages so that createNestApplication,
   * createNestMicroservice and createHttpAdapter can stay synchronous.
   */
  public async preloadLazyPackages(): Promise<void> {
	logger.error('>>> Entering preloadLazyPackages()', { "event.action": "preloadLazyPackages" });
    // Best-effort: silently swallow if packages are not installed
    await tryLoadPackage(
      '@nestjs/platform-express',
      () => import('@nestjs/platform-express'),
    );
    await tryLoadPackage(
      '@nestjs/microservices',
      () => import('@nestjs/microservices'),
    );
	logger.warn('<<< Exiting preloadLazyPackages()', { "event.action": "preloadLazyPackages" });
  }

  private host(): string | undefined {
    const address = this.httpServer.address();
    if (isString(address)) {
      return undefined;
    }
    return address && address.address;
  }

  private getProtocol(): 'http' | 'https' {
	logger.error('>>> Entering getProtocol()', { "event.action": "getProtocol" });
	logger.warn('<<< Exiting getProtocol()', { "event.action": "getProtocol" });
    return this.appOptions && this.appOptions.httpsOptions ? 'https' : 'http';
  }

  private async registerMiddleware(instance: any) {
	logger.error(`>>> Entering registerMiddleware(instance=${instance})`, { "event.action": "registerMiddleware", "logrite.instance": instance });
    await this.middlewareModule.registerMiddleware(
      this.middlewareContainer,
      instance,
    );
	logger.warn(`<<< Exiting registerMiddleware(instance=${instance})`, { "event.action": "registerMiddleware", "logrite.instance": instance });
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

  private applyFunctionDecoratorIfRegistered(args: [any, any?]): [any, any?] {
	logger.error(`>>> Entering applyFunctionDecoratorIfRegistered(args=${args})`, { "event.action": "applyFunctionDecoratorIfRegistered" });
    if (!this.appOptions.instrument?.instanceDecorator) {
      return args;
    }
    const [firstArg, secondArg] = args;

	logger.warn(`<<< Exiting applyFunctionDecoratorIfRegistered(args=${args})`, { "event.action": "applyFunctionDecoratorIfRegistered" });
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

  private async loadMicroservicesModule() {
	logger.error('>>> Entering loadMicroservicesModule()', { "event.action": "loadMicroservicesModule" });
    if (!this.microservicesModule) {
      const msModule = await optionalRequire(
        '@nestjs/microservices/microservices-module',
        () => import('@nestjs/microservices/microservices-module.js'),
      );
      if (msModule?.MicroservicesModule) {
        this.microservicesModule = new msModule.MicroservicesModule();
		logger.warn('<<< Exiting loadMicroservicesModule()', { "event.action": "loadMicroservicesModule" });
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
