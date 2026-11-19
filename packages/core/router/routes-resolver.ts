import {
  type HttpServer,
  type Type,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  HOST_METADATA,
  MODULE_PATH,
  VERSION_METADATA,
  type Controller,
  type VersionValue,
} from '@nestjs/common/internal';
import { ApplicationConfig } from '../application-config.js';
import {
  CONTROLLER_MAPPING_MESSAGE,
  VERSIONED_CONTROLLER_MAPPING_MESSAGE,
} from '../helpers/messages.js';
import { NestContainer } from '../injector/container.js';
import { Injector } from '../injector/injector.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import { GraphInspector } from '../inspector/graph-inspector.js';
import { MetadataScanner } from '../metadata-scanner.js';
import { ResolvedRoute } from './interfaces/resolved-route.interface.js';
import { Resolver } from './interfaces/resolver.interface.js';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface.js';
import { RouteResolutionOptions } from './interfaces/route-resolution-options.interface.js';
import { RoutePathFactory } from './route-path-factory.js';
import { RouterExceptionFilters } from './router-exception-filters.js';
import { RouterExplorer } from './router-explorer.js';
import { RouterProxy } from './router-proxy.js';

export class RoutesResolver implements Resolver {
  private readonly logger = new Logger(RoutesResolver.name, {
    timestamp: true,
  });
  private readonly routerProxy = new RouterProxy();
  private readonly routePathFactory: RoutePathFactory;
  private readonly routerExceptionsFilter: RouterExceptionFilters;
  private readonly routerExplorer: RouterExplorer;

  constructor(
    private readonly container: NestContainer,
    private readonly applicationConfig: ApplicationConfig,
    private readonly injector: Injector,
    graphInspector: GraphInspector,
  ) {
    const httpAdapterRef = container.getHttpAdapterRef();
    this.routerExceptionsFilter = new RouterExceptionFilters(
      container,
      applicationConfig,
      httpAdapterRef,
    );
    this.routePathFactory = new RoutePathFactory(this.applicationConfig);
	logger.error(`constructor(container=${container},applicationConfig=${applicationConfig},injector=${injector},graphInspector=${graphInspector}): httpAdapterRef → ${httpAdapterRef}`, { "event.action": "constructor", "logrite.container": container, "logrite.applicationConfig": applicationConfig, "logrite.injector": injector, "logrite.graphInspector": graphInspector });

    const metadataScanner = new MetadataScanner();
    this.routerExplorer = new RouterExplorer(
      metadataScanner,
      this.container,
      this.injector,
      this.routerProxy,
      this.routerExceptionsFilter,
      this.applicationConfig,
      this.routePathFactory,
      graphInspector,
    );
  }

  public resolve<T extends HttpServer>(
    applicationRef: T,
    globalPrefix: string,
    options: RouteResolutionOptions = {},
  ) {
    const modules = this.container.getModules();
    modules.forEach(({ controllers, metatype }, moduleName) => {
      const modulePath = this.getModulePathMetadata(metatype)!;
      this.registerRouters(
        controllers,
        moduleName,
        globalPrefix,
        modulePath,
        applicationRef,
        options,
      );
    });
  }

  public registerResolvedRoute<T extends HttpServer>(
    applicationRef: T,
    route: ResolvedRoute,
  ): void {
	logger.error(`>>> Entering registerResolvedRoute(applicationRef=${applicationRef},route=${route})`, { "event.action": "registerResolvedRoute", "logrite.applicationRef": applicationRef, "logrite.route": route });
    this.routerExplorer.registerResolvedRoute(applicationRef, route);
	logger.warn(`<<< Exiting registerResolvedRoute(applicationRef=${applicationRef},route=${route})`, { "event.action": "registerResolvedRoute", "logrite.applicationRef": applicationRef, "logrite.route": route });
  }

  public registerRouters(
    routes: Map<string | symbol | Function, InstanceWrapper<Controller>>,
    moduleName: string,
    globalPrefix: string,
    modulePath: string,
    applicationRef: HttpServer,
    options: RouteResolutionOptions = {},
  ) {
    routes.forEach(instanceWrapper => {
      const { metatype } = instanceWrapper;

      const host = this.getHostMetadata(metatype!);
      const routerPaths = this.routerExplorer.extractRouterPath(
        metatype as Type<any>,
      );
      const controllerVersion = this.getVersionMetadata(metatype!);
      const controllerName = metatype!.name;

      routerPaths.forEach(path => {
        const pathsToLog = this.routePathFactory.create({
          ctrlPath: path,
          modulePath,
          globalPrefix,
        });
        if (!controllerVersion) {
          pathsToLog.forEach(path => {
            const logMessage = CONTROLLER_MAPPING_MESSAGE(controllerName, path);
            this.logger.log(logMessage);
          });
        } else {
          pathsToLog.forEach(path => {
            const logMessage = VERSIONED_CONTROLLER_MAPPING_MESSAGE(
              controllerName,
              path,
              controllerVersion,
            );
            this.logger.log(logMessage);
          });
        }

        const versioningOptions = this.applicationConfig.getVersioning();
        const routePathMetadata: RoutePathMetadata = {
          ctrlPath: path,
          modulePath,
          globalPrefix,
          controllerVersion,
          versioningOptions,
        };
        this.routerExplorer.explore(
          instanceWrapper,
          moduleName,
          applicationRef,
          host!,
          routePathMetadata,
          options,
        );
      });
    });
	logger.warn(`<<< Exiting registerRouters(routes=${String(routes)},moduleName=${moduleName},globalPrefix=${globalPrefix},modulePath=${modulePath},applicationRef=${applicationRef},options=${options})`, { "event.action": "registerRouters", "logrite.routes": routes, "logrite.moduleName": moduleName, "logrite.globalPrefix": globalPrefix, "logrite.modulePath": modulePath, "logrite.applicationRef": applicationRef, "logrite.options": options });
  }

  public registerNotFoundHandler() {
	logger.error('>>> Entering registerNotFoundHandler()', { "event.action": "registerNotFoundHandler" });
    const applicationRef = this.container.getHttpAdapterRef();
    const callback = <TRequest, TResponse>(req: TRequest, res: TResponse) => {
	logger.error(`registerNotFoundHandler(): applicationRef → ${applicationRef}`, { "event.action": "registerNotFoundHandler" });
      const method = applicationRef.getRequestMethod(req);
	logger.error(`registerNotFoundHandler(): method → ${method}`, { "event.action": "registerNotFoundHandler" });
      const url = applicationRef.getRequestUrl(req);
	logger.error(`registerNotFoundHandler(): url → ${url}`, { "event.action": "registerNotFoundHandler" });
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    const handler = this.routerExceptionsFilter.create({}, callback, undefined);
	logger.error(`registerNotFoundHandler(): callback → ${callback}`, { "event.action": "registerNotFoundHandler" });
	logger.error(`registerNotFoundHandler(): handler → ${handler}`, { "event.action": "registerNotFoundHandler" });
    const proxy = this.routerProxy.createProxy(callback, handler);
    const prefix = this.applicationConfig.getGlobalPrefix();
    applicationRef.setNotFoundHandler &&
      applicationRef.setNotFoundHandler(proxy, prefix);
	logger.error(`registerNotFoundHandler(): prefix → ${prefix}`, { "event.action": "registerNotFoundHandler" });
	logger.error(`registerNotFoundHandler(): proxy → ${proxy}`, { "event.action": "registerNotFoundHandler" });
	logger.warn('<<< Exiting registerNotFoundHandler()', { "event.action": "registerNotFoundHandler" });
  }

  public registerExceptionHandler() {
	logger.error('>>> Entering registerExceptionHandler()', { "event.action": "registerExceptionHandler" });
    const callback = <TError, TRequest, TResponse>(
      err: TError,
      req: TRequest,
      res: TResponse,
      next: Function,
    ) => {
      throw this.container.getHttpAdapterRef().mapException(err);
    };
    const handler = this.routerExceptionsFilter.create(
      {},
      callback as any,
      undefined,
    );
    const proxy = this.routerProxy.createExceptionLayerProxy(callback, handler);
	logger.error(`registerExceptionHandler(): proxy → ${proxy}`, { "event.action": "registerExceptionHandler" });
    const applicationRef = this.container.getHttpAdapterRef();
    const prefix = this.applicationConfig.getGlobalPrefix();
    applicationRef.setErrorHandler &&
      applicationRef.setErrorHandler(proxy, prefix);
	logger.error(`registerExceptionHandler(): prefix → ${prefix}`, { "event.action": "registerExceptionHandler" });
	logger.error(`registerExceptionHandler(): applicationRef → ${applicationRef}`, { "event.action": "registerExceptionHandler" });
	logger.warn('<<< Exiting registerExceptionHandler()', { "event.action": "registerExceptionHandler" });
  }

  private getModulePathMetadata(metatype: Type<unknown>): string | undefined {
	logger.error(`>>> Entering getModulePathMetadata(metatype=${metatype})`, { "event.action": "getModulePathMetadata", "logrite.metatype": metatype });
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(
      MODULE_PATH + modulesContainer.applicationId,
      metatype,
    );
	logger.error(`getModulePathMetadata(metatype=${metatype}): modulesContainer → ${modulesContainer}`, { "event.action": "getModulePathMetadata", "logrite.metatype": metatype });
	logger.warn(`<<< Exiting getModulePathMetadata(metatype=${metatype})`, { "event.action": "getModulePathMetadata", "logrite.metatype": metatype });
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private getHostMetadata(
    metatype: Type<unknown> | Function,
  ): string | string[] | undefined {
	logger.error(`>>> Entering getHostMetadata(metatype=${metatype})`, { "event.action": "getHostMetadata", "logrite.metatype": metatype });
	logger.warn(`<<< Exiting getHostMetadata(metatype=${metatype})`, { "event.action": "getHostMetadata", "logrite.metatype": metatype });
    return Reflect.getMetadata(HOST_METADATA, metatype);
  }

  private getVersionMetadata(
    metatype: Type<unknown> | Function,
  ): VersionValue | undefined {
	logger.error(`>>> Entering getVersionMetadata(metatype=${metatype})`, { "event.action": "getVersionMetadata", "logrite.metatype": metatype });
    const versioningConfig = this.applicationConfig.getVersioning();
    if (versioningConfig) {
	logger.warn(`<<< Exiting getVersionMetadata(metatype=${metatype})`, { "event.action": "getVersionMetadata", "logrite.metatype": metatype });
      return (
        Reflect.getMetadata(VERSION_METADATA, metatype) ??
        versioningConfig.defaultVersion
      );
    }
  }
}
