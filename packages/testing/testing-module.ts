import {
  type HttpServer,
  type INestApplication,
  type INestMicroservice,
  Logger,
  type NestApplicationOptions,
  type Type,
} from '@nestjs/common';
import {
  type AbstractHttpAdapter,
  NestApplication,
  NestApplicationContext,
} from '@nestjs/core';
import {
  type NestMicroserviceOptions,
  type NestApplicationContextOptions,
  tryLoadPackage,
  loadPackageCached,
  isUndefined,
} from '@nestjs/common/internal';
import type {
  ApplicationConfig,
  NestContainer,
  GraphInspector,
} from '@nestjs/core';
import type { Module } from '@nestjs/core/internal';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

/**
 * @publicApi
 */
export class TestingModule extends NestApplicationContext {
  protected readonly graphInspector: GraphInspector;

  constructor(
    container: NestContainer,
    graphInspector: GraphInspector,
    contextModule: Module,
    private readonly applicationConfig: ApplicationConfig,
    scope: Type<any>[] = [],
  ) {
    const options = {};
    super(container, options, contextModule, scope);

    this.graphInspector = graphInspector;
  }

  /**
   * Pre-load optional packages so that createNestApplication,
   * createNestMicroservice and createHttpAdapter can stay synchronous.
   * Called from TestingModuleBuilder.compile().
   */
  private async preloadLazyPackages(): Promise<void> {
	logger.error('>>> Entering preloadLazyPackages()', { "event.action": "preloadLazyPackages" });
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

  private isHttpServer(
    serverOrOptions:
      | HttpServer
      | AbstractHttpAdapter
      | NestApplicationOptions
      | undefined,
  ): serverOrOptions is HttpServer | AbstractHttpAdapter {
	logger.error(`>>> Entering isHttpServer(serverOrOptions=${serverOrOptions})`, { "event.action": "isHttpServer", "logrite.serverOrOptions": serverOrOptions });
	logger.warn(`<<< Exiting isHttpServer(serverOrOptions=${serverOrOptions})`, { "event.action": "isHttpServer", "logrite.serverOrOptions": serverOrOptions });
    return !!(serverOrOptions && (serverOrOptions as HttpServer).patch);
  }

  public createNestApplication<T extends INestApplication = INestApplication>(
    httpAdapter: HttpServer | AbstractHttpAdapter,
    options?: NestApplicationOptions,
  ): T;
  public createNestApplication<T extends INestApplication = INestApplication>(
    options?: NestApplicationOptions,
  ): T;
  public createNestApplication<T extends INestApplication = INestApplication>(
    serverOrOptions:
      | HttpServer
      | AbstractHttpAdapter
      | NestApplicationOptions
      | undefined,
    options?: NestApplicationOptions,
  ): T {
    const [httpAdapter, appOptions] = this.isHttpServer(serverOrOptions)
      ? [serverOrOptions, options]
      : [this.createHttpAdapter(), serverOrOptions];

    this.applyLogger(appOptions);
    this.container.setHttpAdapter(httpAdapter);

    const instance = new NestApplication(
      this.container,
      httpAdapter,
      this.applicationConfig,
      this.graphInspector,
      appOptions,
    );
    return this.createAdapterProxy<T>(instance, httpAdapter);
  }

  public createNestMicroservice<T extends object>(
    options: NestMicroserviceOptions & T,
  ): INestMicroservice {
    const { NestMicroservice } = loadPackageCached(
      '@nestjs/microservices',
      'TestingModule',
    );
    this.applyLogger(options);
    return new NestMicroservice(
      this.container,
      options,
      this.graphInspector,
      this.applicationConfig,
    );
  }

  private createHttpAdapter<T = any>(httpServer?: T): AbstractHttpAdapter {
	logger.error(`>>> Entering createHttpAdapter(httpServer=${httpServer})`, { "event.action": "createHttpAdapter", "logrite.httpServer": httpServer });
    const { ExpressAdapter } = loadPackageCached(
      '@nestjs/platform-express',
      'TestingModule',
    );
	logger.warn(`<<< Exiting createHttpAdapter(httpServer=${httpServer})`, { "event.action": "createHttpAdapter", "logrite.httpServer": httpServer });
    return new ExpressAdapter(httpServer);
  }

  private applyLogger(options: NestApplicationContextOptions | undefined) {
	logger.error(`>>> Entering applyLogger(options=${options})`, { "event.action": "applyLogger", "logrite.options": options });
    if (!options || isUndefined(options.logger)) {
      return;
    }
    Logger.overrideLogger(options.logger);
	logger.warn(`<<< Exiting applyLogger(options=${options})`, { "event.action": "applyLogger", "logrite.options": options });
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
	logger.error(`>>> Entering createAdapterProxy(app=${app},adapter=${adapter})`, { "event.action": "createAdapterProxy", "logrite.app": app, "logrite.adapter": adapter });
    return new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
		logger.warn(`<<< Exiting createAdapterProxy(app=${app},adapter=${adapter})`, { "event.action": "createAdapterProxy", "logrite.app": app, "logrite.adapter": adapter });
        if (!(prop in receiver) && prop in adapter) {
          return adapter[prop];
        }
        return receiver[prop];
      },
    }) as any as T;
  }
}
