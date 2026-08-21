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
	logger.debug(`constructor(container=${container},applicationConfig=${applicationConfig},injector=${injector},graphInspector=${graphInspector}): httpAdapterRef → ${httpAdapterRef}`);

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
	logger.debug(`>>> Entering registerResolvedRoute(applicationRef=${applicationRef},route=${route})`);
    this.routerExplorer.registerResolvedRoute(applicationRef, route);
	logger.debug(`<<< Exiting registerResolvedRoute(applicationRef=${applicationRef},route=${route})`);
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
	logger.debug(`<<< Exiting registerRouters(routes=${routes},moduleName=${moduleName},globalPrefix=${globalPrefix},modulePath=${modulePath},applicationRef=${applicationRef},options=${options})`);
  }

  public registerNotFoundHandler() {
	logger.debug('>>> Entering registerNotFoundHandler()');
    const applicationRef = this.container.getHttpAdapterRef();
    const callback = <TRequest, TResponse>(req: TRequest, res: TResponse) => {
	logger.debug(`registerNotFoundHandler(): applicationRef → ${applicationRef}`);
      const method = applicationRef.getRequestMethod(req);
	logger.debug(`registerNotFoundHandler(): method → ${method}`);
      const url = applicationRef.getRequestUrl(req);
	logger.debug(`registerNotFoundHandler(): url → ${url}`);
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    const handler = this.routerExceptionsFilter.create({}, callback, undefined);
	logger.debug(`registerNotFoundHandler(): callback → ${callback}`);
	logger.debug(`registerNotFoundHandler(): handler → ${handler}`);
    const proxy = this.routerProxy.createProxy(callback, handler);
    const prefix = this.applicationConfig.getGlobalPrefix();
    applicationRef.setNotFoundHandler &&
      applicationRef.setNotFoundHandler(proxy, prefix);
	logger.debug(`registerNotFoundHandler(): proxy → ${proxy}`);
  }

  public registerExceptionHandler() {
	logger.debug('>>> Entering registerExceptionHandler()');
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
	logger.debug(`registerExceptionHandler(): proxy → ${proxy}`);
    const applicationRef = this.container.getHttpAdapterRef();
    const prefix = this.applicationConfig.getGlobalPrefix();
    applicationRef.setErrorHandler &&
      applicationRef.setErrorHandler(proxy, prefix);
	logger.debug(`registerExceptionHandler(): applicationRef → ${applicationRef}`);
  }

  private getModulePathMetadata(metatype: Type<unknown>): string | undefined {
	logger.debug(`>>> Entering getModulePathMetadata(metatype=${metatype})`);
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(
      MODULE_PATH + modulesContainer.applicationId,
      metatype,
    );
	logger.debug(`getModulePathMetadata(metatype=${metatype}): modulesContainer → ${modulesContainer}`);
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private getHostMetadata(
    metatype: Type<unknown> | Function,
  ): string | string[] | undefined {
	logger.debug(`>>> Entering getHostMetadata(metatype=${metatype})`);
	logger.debug(`<<< Exiting getHostMetadata(metatype=${metatype})`);
    return Reflect.getMetadata(HOST_METADATA, metatype);
  }

  private getVersionMetadata(
    metatype: Type<unknown> | Function,
  ): VersionValue | undefined {
    const versioningConfig = this.applicationConfig.getVersioning();
	logger.debug(`getVersionMetadata(metatype=${metatype}): versioningConfig → ${versioningConfig}`);
    if (versioningConfig) {
	logger.debug(`>>> Entering getVersionMetadata(metatype=${metatype})`);
	logger.debug(`<<< Exiting getVersionMetadata(metatype=${metatype})`);
      return (
        Reflect.getMetadata(VERSION_METADATA, metatype) ??
        versioningConfig.defaultVersion
      );
    }
  }
}
