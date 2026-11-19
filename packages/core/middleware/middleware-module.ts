import { type HttpServer, type InjectionToken, Logger } from '@nestjs/common';
import { ApplicationConfig } from '../application-config.js';
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware.exception.js';
import { RuntimeException } from '../errors/exceptions/runtime.exception.js';
import { ContextIdFactory } from '../helpers/context-id-factory.js';
import { ExecutionContextHost } from '../helpers/execution-context-host.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { Injector } from '../injector/injector.js';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper.js';
import { Module } from '../injector/module.js';
import { GraphInspector } from '../inspector/graph-inspector.js';
import {
  Entrypoint,
  MiddlewareEntrypointMetadata,
} from '../inspector/interfaces/entrypoint.interface.js';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants.js';
import { RouterExceptionFilters } from '../router/router-exception-filters.js';
import { RouterProxy } from '../router/router-proxy.js';
import { isRequestMethodAll } from '../router/utils/index.js';
import { MiddlewareBuilder } from './builder.js';
import { MiddlewareContainer } from './container.js';
import { MiddlewareResolver } from './resolver.js';
import { RouteInfoPathExtractor } from './route-info-path-extractor.js';
import { RoutesMapper } from './routes-mapper.js';
import { RequestMethod, type NestMiddleware } from '@nestjs/common';
import {
  type MiddlewareConfiguration,
  type RouteInfo,
  type NestApplicationContextOptions,
  isUndefined,
} from '@nestjs/common/internal';

export class MiddlewareModule<
  TAppOptions extends NestApplicationContextOptions =
    NestApplicationContextOptions,
> {
  private readonly routerProxy = new RouterProxy();
  private readonly exceptionFiltersCache = new WeakMap();
  private readonly logger = new Logger(MiddlewareModule.name);

  private injector: Injector;
  private routerExceptionFilter: RouterExceptionFilters;
  private routesMapper: RoutesMapper;
  private resolver: MiddlewareResolver;
  private container: NestContainer;
  private httpAdapter: HttpServer;
  private graphInspector: GraphInspector;
  private appOptions: TAppOptions;
  private routeInfoPathExtractor: RouteInfoPathExtractor;

  public async register(
    middlewareContainer: MiddlewareContainer,
    container: NestContainer,
    config: ApplicationConfig,
    injector: Injector,
    httpAdapter: HttpServer,
    graphInspector: GraphInspector,
    options: TAppOptions,
  ) {
    this.appOptions = options;

    const appRef = container.getHttpAdapterRef();
    this.routerExceptionFilter = new RouterExceptionFilters(
      container,
      config,
      appRef,
    );
    this.routesMapper = new RoutesMapper(container, config);
    this.resolver = new MiddlewareResolver(middlewareContainer, injector);
    this.routeInfoPathExtractor = new RouteInfoPathExtractor(config);
    this.injector = injector;
    this.container = container;
    this.httpAdapter = httpAdapter;
    this.graphInspector = graphInspector;

    const modules = container.getModules();
    await this.resolveMiddleware(middlewareContainer, modules);
  }

  public async resolveMiddleware(
    middlewareContainer: MiddlewareContainer,
    modules: Map<string, Module>,
  ) {
	logger.error(`>>> Entering resolveMiddleware(middlewareContainer=${middlewareContainer},modules=${modules})`, { "event.action": "resolveMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.modules": modules });
    const moduleEntries = [...modules.entries()];
    const loadMiddlewareConfiguration = async ([moduleName, moduleRef]: [
      string,
      Module,
    ]) => {
	logger.error('>>> Entering loadMiddlewareConfiguration()', { "event.action": "loadMiddlewareConfiguration" });
      await this.loadConfiguration(middlewareContainer, moduleRef, moduleName);
      await this.resolver.resolveInstances(moduleRef, moduleName);
	logger.warn('<<< Exiting loadMiddlewareConfiguration()', { "event.action": "loadMiddlewareConfiguration" });
    };
    await Promise.all(moduleEntries.map(loadMiddlewareConfiguration));
	logger.error(`resolveMiddleware(middlewareContainer=${middlewareContainer},modules=${modules}): moduleEntries → ${moduleEntries}`, { "event.action": "resolveMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.modules": modules });
  }

  public async loadConfiguration(
    middlewareContainer: MiddlewareContainer,
    moduleRef: Module,
    moduleKey: string,
  ) {
	logger.error(`>>> Entering loadConfiguration(middlewareContainer=${middlewareContainer},moduleRef=${moduleRef},moduleKey=${moduleKey})`, { "event.action": "loadConfiguration", "logrite.middlewareContainer": middlewareContainer, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey });
    const { instance } = moduleRef;
    if (!instance.configure) {
      return;
    }
    const middlewareBuilder = new MiddlewareBuilder(
      this.routesMapper,
      this.httpAdapter,
      this.routeInfoPathExtractor,
    );
    try {
	logger.error(`loadConfiguration(middlewareContainer=${middlewareContainer},moduleRef=${moduleRef},moduleKey=${moduleKey}): middlewareBuilder → ${middlewareBuilder}`, { "event.action": "loadConfiguration", "logrite.middlewareContainer": middlewareContainer, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey });
      await instance.configure(middlewareBuilder);
    } catch (err) {
      if (!this.appOptions.preview) {
        throw err;
      }
      const warningMessage =
        `Warning! "${moduleRef.name}" module exposes a "configure" method that throws an exception in the preview mode` +
        ` (possibly due to missing dependencies). Note: you can ignore this message, just be aware that some of those conditional middlewares will not be reflected in your graph.`;
      this.logger.warn(warningMessage);
    }

    if (!(middlewareBuilder instanceof MiddlewareBuilder)) {
      return;
    }
    const config = middlewareBuilder.build();
    middlewareContainer.insertConfig(config, moduleKey);
	logger.error(`loadConfiguration(middlewareContainer=${middlewareContainer},moduleRef=${moduleRef},moduleKey=${moduleKey}): config → ${config}`, { "event.action": "loadConfiguration", "logrite.middlewareContainer": middlewareContainer, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey });
	logger.warn(`<<< Exiting loadConfiguration(middlewareContainer=${middlewareContainer},moduleRef=${moduleRef},moduleKey=${moduleKey})`, { "event.action": "loadConfiguration", "logrite.middlewareContainer": middlewareContainer, "logrite.moduleRef": moduleRef, "logrite.moduleKey": moduleKey });
  }

  public async registerMiddleware(
    middlewareContainer: MiddlewareContainer,
    applicationRef: any,
  ) {
	logger.error(`>>> Entering registerMiddleware(middlewareContainer=${middlewareContainer},applicationRef=${applicationRef})`, { "event.action": "registerMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.applicationRef": applicationRef });
    const configs = middlewareContainer.getConfigurations();
    const registerAllConfigs = async (
      moduleKey: string,
      middlewareConfig: MiddlewareConfiguration[],
    ) => {
	logger.error(`>>> Entering registerAllConfigs(moduleKey=${moduleKey},middlewareConfig=${middlewareConfig})`, { "event.action": "registerAllConfigs", "logrite.moduleKey": moduleKey, "logrite.middlewareConfig": middlewareConfig });
      for (const config of middlewareConfig) {
		logger.warn(`<<< Exiting registerAllConfigs(moduleKey=${moduleKey},middlewareConfig=${middlewareConfig})`, { "event.action": "registerAllConfigs", "logrite.moduleKey": moduleKey, "logrite.middlewareConfig": middlewareConfig });
        await this.registerMiddlewareConfig(
          middlewareContainer,
          config,
          moduleKey,
          applicationRef,
        );
      }
    };

    const entriesSortedByDistance = [...configs.entries()].sort(
      ([moduleA], [moduleB]) => {
        const moduleARef = this.container.getModuleByKey(moduleA)!;
		logger.error(`registerMiddleware(middlewareContainer=${middlewareContainer},applicationRef=${applicationRef}): configs → ${configs}`, { "event.action": "registerMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.applicationRef": applicationRef });
		logger.error(`registerMiddleware(middlewareContainer=${middlewareContainer},applicationRef=${applicationRef}): moduleARef → ${moduleARef}`, { "event.action": "registerMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.applicationRef": applicationRef });
        const moduleBRef = this.container.getModuleByKey(moduleB)!;
        const isModuleAGlobal = moduleARef.distance === Number.MAX_VALUE;
		logger.error(`registerMiddleware(middlewareContainer=${middlewareContainer},applicationRef=${applicationRef}): moduleBRef → ${moduleBRef}`, { "event.action": "registerMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.applicationRef": applicationRef });
        const isModuleBGlobal = moduleBRef.distance === Number.MAX_VALUE;
        if (isModuleAGlobal && isModuleBGlobal) {
          return 0;
        }
        if (isModuleAGlobal) {
          return -1;
        }
        if (isModuleBGlobal) {
          return 1;
        }
        return moduleARef.distance - moduleBRef.distance;
      },
    );
    for (const [moduleRef, moduleConfigurations] of entriesSortedByDistance) {
	logger.error(`registerMiddleware(middlewareContainer=${middlewareContainer},applicationRef=${applicationRef}): entriesSortedByDistance → ${entriesSortedByDistance}`, { "event.action": "registerMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.applicationRef": applicationRef });
      await registerAllConfigs(moduleRef, [...moduleConfigurations]);
	logger.warn(`<<< Exiting registerMiddleware(middlewareContainer=${middlewareContainer},applicationRef=${applicationRef})`, { "event.action": "registerMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.applicationRef": applicationRef });
    }
  }

  public async registerMiddlewareConfig(
    middlewareContainer: MiddlewareContainer,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
  ) {
	logger.error(`>>> Entering registerMiddlewareConfig(middlewareContainer=${middlewareContainer},config=${config},moduleKey=${moduleKey},applicationRef=${applicationRef})`, { "event.action": "registerMiddlewareConfig", "logrite.middlewareContainer": middlewareContainer, "logrite.config": config, "logrite.moduleKey": moduleKey, "logrite.applicationRef": applicationRef });
    const { forRoutes } = config;
    for (const routeInfo of forRoutes) {
      await this.registerRouteMiddleware(
        middlewareContainer,
        routeInfo as RouteInfo,
        config,
        moduleKey,
        applicationRef,
      );
    }
	logger.warn(`<<< Exiting registerMiddlewareConfig(middlewareContainer=${middlewareContainer},config=${config},moduleKey=${moduleKey},applicationRef=${applicationRef})`, { "event.action": "registerMiddlewareConfig", "logrite.middlewareContainer": middlewareContainer, "logrite.config": config, "logrite.moduleKey": moduleKey, "logrite.applicationRef": applicationRef });
  }

  public async registerRouteMiddleware(
    middlewareContainer: MiddlewareContainer,
    routeInfo: RouteInfo,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
  ) {
    const middlewareCollection = [].concat(config.middleware);
    const moduleRef = this.container.getModuleByKey(moduleKey)!;

    for (const metatype of middlewareCollection) {
      const collection = middlewareContainer.getMiddlewareCollection(moduleKey);
      const instanceWrapper = collection.get(metatype);

      if (isUndefined(instanceWrapper)) {
        throw new RuntimeException();
      }
      if (instanceWrapper.isTransient) {
        return;
      }

      this.graphInspector.insertClassNode(
        moduleRef,
        instanceWrapper,
        'middleware',
      );
      const middlewareDefinition: Entrypoint<MiddlewareEntrypointMetadata> = {
        type: 'middleware',
        methodName: 'use',
        className: instanceWrapper.name,
        classNodeId: instanceWrapper.id,
        metadata: {
          key: routeInfo.path,
          path: routeInfo.path,
          requestMethod:
            (RequestMethod[routeInfo.method] as keyof typeof RequestMethod) ??
            'ALL',
          version: routeInfo.version,
        },
      };
      this.graphInspector.insertEntrypointDefinition(
        middlewareDefinition,
        instanceWrapper.id,
      );

      await this.bindHandler(
        instanceWrapper,
        applicationRef,
        routeInfo,
        moduleRef,
        collection,
      );
    }
	logger.warn(`<<< Exiting registerRouteMiddleware(middlewareContainer=${middlewareContainer},routeInfo=${routeInfo},config=${config},moduleKey=${moduleKey},applicationRef=${applicationRef})`, { "event.action": "registerRouteMiddleware", "logrite.middlewareContainer": middlewareContainer, "logrite.routeInfo": routeInfo, "logrite.config": config, "logrite.moduleKey": moduleKey, "logrite.applicationRef": applicationRef });
  }

  private async bindHandler(
    wrapper: InstanceWrapper<NestMiddleware>,
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    moduleRef: Module,
    collection: Map<InjectionToken, InstanceWrapper>,
  ) {
	logger.error(`>>> Entering bindHandler(wrapper=${wrapper},applicationRef=${applicationRef},routeInfo=${routeInfo},moduleRef=${moduleRef},collection=${collection})`, { "event.action": "bindHandler", "logrite.wrapper": wrapper, "logrite.applicationRef": applicationRef, "logrite.routeInfo": routeInfo, "logrite.moduleRef": moduleRef, "logrite.collection": collection });
    const { instance, metatype } = wrapper;

    if (isUndefined(instance?.use)) {
      throw new InvalidMiddlewareException(metatype!.name);
    }
    const isStatic = wrapper.isDependencyTreeStatic();
    if (isStatic) {
      const proxy = await this.createProxy(instance);
      return this.registerHandler(applicationRef, routeInfo, proxy);
    }

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    await this.registerHandler(
      applicationRef,
      routeInfo,
      async <TRequest, TResponse>(
        req: TRequest,
        res: TResponse,
        next: () => void,
      ) => {
        try {
          const contextId = this.getContextId(req, isTreeDurable);
          const contextInstance = await this.injector.loadPerContext(
            instance,
            moduleRef,
            collection,
            contextId,
          );
          const proxy = await this.createProxy<TRequest, TResponse>(
            contextInstance,
            contextId,
          );
          return proxy(req, res, next);
        } catch (err) {
		logger.error(`Exception in bindHandler(wrapper=${wrapper},applicationRef=${applicationRef},routeInfo=${routeInfo},moduleRef=${moduleRef},collection=${collection}): ${(err as Error).message}`, err, { "event.action": "bindHandler", "event.category": "process", "logrite.wrapper": wrapper, "logrite.applicationRef": applicationRef, "logrite.routeInfo": routeInfo, "logrite.moduleRef": moduleRef, "logrite.collection": collection });
          let exceptionsHandler = this.exceptionFiltersCache.get(instance.use);
          if (!exceptionsHandler) {
            exceptionsHandler = this.routerExceptionFilter.create(
              instance,
              instance.use,
              undefined,
            );
            this.exceptionFiltersCache.set(instance.use, exceptionsHandler);
          }
          const host = new ExecutionContextHost([req, res, next]);
          exceptionsHandler.next(err, host);
        }
      },
    );
	logger.warn(`<<< Exiting bindHandler(wrapper=${wrapper},applicationRef=${applicationRef},routeInfo=${routeInfo},moduleRef=${moduleRef},collection=${collection})`, { "event.action": "bindHandler", "logrite.wrapper": wrapper, "logrite.applicationRef": applicationRef, "logrite.routeInfo": routeInfo, "logrite.moduleRef": moduleRef, "logrite.collection": collection });
  }

  private async createProxy<TRequest = unknown, TResponse = unknown>(
    instance: NestMiddleware,
    contextId = STATIC_CONTEXT,
  ): Promise<(req: TRequest, res: TResponse, next: () => void) => void> {
	logger.error(`>>> Entering createProxy(instance=${instance},contextId=${contextId})`, { "event.action": "createProxy", "logrite.instance": instance, "logrite.contextId": contextId });
    const exceptionsHandler = this.routerExceptionFilter.create(
      instance,
      instance.use,
      undefined,
      contextId,
    );
    const middleware = instance.use.bind(instance);
	logger.error(`createProxy(instance=${instance},contextId=${contextId}): middleware → ${middleware}`, { "event.action": "createProxy", "logrite.instance": instance, "logrite.contextId": contextId });
	logger.warn(`<<< Exiting createProxy(instance=${instance},contextId=${contextId})`, { "event.action": "createProxy", "logrite.instance": instance, "logrite.contextId": contextId });
    return this.routerProxy.createProxy(middleware, exceptionsHandler);
  }

  private async registerHandler(
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    proxy: <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => void,
  ) {
    const { method } = routeInfo;
    const paths = this.routeInfoPathExtractor.extractPathsFrom(routeInfo);
    const isMethodAll = isRequestMethodAll(method);
    const requestMethod = RequestMethod[method];
    const router = await applicationRef.createMiddlewareFactory(method);
    const middlewareFunction = isMethodAll
      ? proxy
      : <TRequest, TResponse>(
          req: TRequest,
          res: TResponse,
          next: () => void,
        ) => {
          const actualRequestMethod = applicationRef.getRequestMethod?.(req);
          if (
            actualRequestMethod === requestMethod ||
            (actualRequestMethod === RequestMethod[RequestMethod.HEAD] &&
              requestMethod === RequestMethod[RequestMethod.GET])
          ) {
            return proxy(req, res, next);
          }
          return next();
        };
    const pathsToApplyMiddleware = [] as string[];
    paths.some(path => path.match(/^\/?$/))
      ? pathsToApplyMiddleware.push('/')
      : pathsToApplyMiddleware.push(...paths);
    pathsToApplyMiddleware.forEach(path => router(path, middlewareFunction));
  }

  private getContextId(request: unknown, isTreeDurable: boolean): ContextId {
	logger.error(`>>> Entering getContextId(request=${request},isTreeDurable=${isTreeDurable})`, { "event.action": "getContextId", "logrite.isTreeDurable": isTreeDurable });
    const contextId = ContextIdFactory.getByRequest(request as object);
    if (!request![REQUEST_CONTEXT_ID]) {
	logger.error(`getContextId(request=${request},isTreeDurable=${isTreeDurable}): contextId → ${contextId}`, { "event.action": "getContextId", "logrite.isTreeDurable": isTreeDurable });
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = isTreeDurable
        ? contextId.payload
        : Object.assign(request as object, contextId.payload);
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
	logger.warn(`<<< Exiting getContextId(request=${request},isTreeDurable=${isTreeDurable})`, { "event.action": "getContextId", "logrite.isTreeDurable": isTreeDurable });
    return contextId;
  }
}
