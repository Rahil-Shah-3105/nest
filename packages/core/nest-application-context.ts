import {
  type INestApplicationContext,
  Logger,
  type LoggerService,
  type LogLevel,
  ShutdownSignal,
} from '@nestjs/common';
import { iterate } from 'iterare';
import { MESSAGES } from './constants.js';
import { UnknownModuleException } from './errors/exceptions/index.js';
import { createContextId } from './helpers/context-id-factory.js';
import {
  callAppShutdownHook,
  callBeforeAppShutdownHook,
  callModuleBootstrapHook,
  callModuleDestroyHook,
  callModuleInitHook,
} from './hooks/index.js';
import { AbstractInstanceResolver } from './injector/abstract-instance-resolver.js';
import { ModuleCompiler } from './injector/compiler.js';
import { NestContainer } from './injector/container.js';
import { Injector } from './injector/injector.js';
import { InstanceLinksHost } from './injector/instance-links-host.js';
import { ContextId } from './injector/instance-wrapper.js';
import { Module } from './injector/module.js';
import type { Abstract, DynamicModule, Type } from '@nestjs/common';
import {
  type GetOrResolveOptions,
  type SelectOptions,
  type ShutdownHooksOptions,
  type NestApplicationContextOptions,
  isEmptyArray,
} from '@nestjs/common/internal';

/**
 * @publicApi
 */
export class NestApplicationContext<
  TOptions extends NestApplicationContextOptions =
    NestApplicationContextOptions,
>
  extends AbstractInstanceResolver
  implements INestApplicationContext
{
  protected isInitialized = false;
  protected injector: Injector;
  protected readonly logger = new Logger(NestApplicationContext.name, {
    timestamp: true,
  });

  private shouldFlushLogsOnOverride = false;
  private readonly activeShutdownSignals = new Array<string>();
  private readonly moduleCompiler: ModuleCompiler;
  private shutdownCleanupRef?: (...args: unknown[]) => unknown;
  private _instanceLinksHost: InstanceLinksHost;
  private _moduleRefsForHooksByDistance?: Array<Module>;
  private initializationPromise?: Promise<void>;

  protected get instanceLinksHost() {
	logger.debug('>>> Entering instanceLinksHost()');
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(
    protected readonly container: NestContainer,
    protected readonly appOptions: TOptions = {} as TOptions,
    private contextModule: Module | null = null,
    private readonly scope = new Array<Type<any>>(),
  ) {
    super();
	logger.debug(`>>> Entering constructor(container=${container},appOptions=${appOptions},contextModule=${contextModule},scope=${scope})`);
    this.injector = new Injector();
    this.moduleCompiler = container.getModuleCompiler();

    if (this.appOptions.preview) {
      this.printInPreviewModeWarning();
	logger.debug(`<<< Exiting constructor(container=${container},appOptions=${appOptions},contextModule=${contextModule},scope=${scope})`);
    }
  }

  public selectContextModule() {
	logger.debug('>>> Entering selectContextModule()');
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value!;
	logger.debug(`selectContextModule(): modules → ${modules}`);
  }

  /**
   * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns {INestApplicationContext}
   */
  public select<T>(
    moduleType: Type<T> | DynamicModule,
    selectOptions?: SelectOptions,
  ): INestApplicationContext {
    const modulesContainer = this.container.getModules();
	logger.debug(`select(moduleType=${moduleType},selectOptions=${selectOptions}): modulesContainer → ${modulesContainer}`);
    const contextModuleCtor = this.contextModule!.metatype;
    const scope = this.scope.concat(contextModuleCtor);
	logger.debug(`select(moduleType=${moduleType},selectOptions=${selectOptions}): scope → ${scope}`);

    const moduleTokenFactory = this.container.getModuleTokenFactory();
    const { type, dynamicMetadata } =
      this.moduleCompiler.extractMetadata(moduleType);
    const token = dynamicMetadata
      ? moduleTokenFactory.createForDynamic(
          type,
          dynamicMetadata,
          moduleType as DynamicModule,
        )
      : moduleTokenFactory.createForStatic(type, moduleType as Type);

    const selectedModule = modulesContainer.get(token);
	logger.debug(`select(moduleType=${moduleType},selectOptions=${selectOptions}): selectedModule → ${selectedModule}`);
    if (!selectedModule) {
	logger.debug(`>>> Entering select(moduleType=${moduleType},selectOptions=${selectOptions})`);
      throw new UnknownModuleException(type.name);
    }

    const options =
      typeof selectOptions?.abortOnError !== 'undefined'
        ? {
            ...this.appOptions,
            ...selectOptions,
          }
        : this.appOptions;

	logger.debug(`<<< Exiting select(moduleType=${moduleType},selectOptions=${selectOptions})`);
    return new NestApplicationContext(
      this.container,
      options,
      selectedModule,
      scope,
    );
  }

  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): TResult;
  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      strict?: boolean;
      each?: undefined | false;
    },
  ): TResult;
  /**
   * Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      strict?: boolean;
      each: true;
    },
  ): Array<TResult>;
  /**
   * Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {TResult | Array<TResult>}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options: GetOrResolveOptions = { strict: false },
  ): TResult | Array<TResult> {
    return !(options && options.strict)
      ? this.find<TInput, TResult>(typeOrToken, options)
      : this.find<TInput, TResult>(typeOrToken, {
          moduleId: this.contextModule?.id,
          each: options.each,
        });
  }

  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: {
      id: number;
    },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: {
      id: number;
    },
    options?: {
      strict?: boolean;
      each?: undefined | false;
    },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: {
      id: number;
    },
    options?: {
      strict?: boolean;
      each: true;
    },
  ): Promise<Array<TResult>>;
  /**
   * Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {Promise<TResult | Array<TResult>>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextId = createContextId(),
    options: GetOrResolveOptions = { strict: false },
  ): Promise<TResult | Array<TResult>> {
    return this.resolvePerContext<TInput, TResult>(
      typeOrToken,
      this.contextModule!,
      contextId,
      options,
    );
  }

  /**
   * Registers the request/context object for a given context ID (DI container sub-tree).
   * @returns {void}
   */
  public registerRequestByContextId<T = any>(request: T, contextId: ContextId) {
	logger.debug(`>>> Entering registerRequestByContextId(request=${request},contextId=${contextId})`);
    this.container.registerRequestProvider(request, contextId);
	logger.debug(`<<< Exiting registerRequestByContextId(request=${request},contextId=${contextId})`);
  }

  /**
   * Initializes the Nest application.
   * Calls the Nest lifecycle events.
   *
   * @returns {Promise<this>} The NestApplicationContext instance as Promise
   */
  public async init(): Promise<this> {
    if (this.isInitialized) {
	logger.debug('>>> Entering init()');
      return this;
    }
    this.initializationPromise = this.callInitHook().then(() =>
      this.callBootstrapHook(),
    );
    await this.initializationPromise;

    this.isInitialized = true;
	logger.debug(`init(): this.isInitialized → ${this.isInitialized}`);
	logger.debug('<<< Exiting init()');
    return this;
  }

  /**
   * Terminates the application
   * @returns {Promise<void>}
   */
  public async close(signal?: string): Promise<void> {
	logger.debug(`>>> Entering close(signal=${signal})`);
    await this.initializationPromise;
    await this.prepareClose();
    await this.callDestroyHook();
    await this.callBeforeShutdownHook(signal);
    await this.dispose();
    await this.callShutdownHook(signal);
    this.unsubscribeFromProcessSignals();
	logger.debug(`<<< Exiting close(signal=${signal})`);
  }

  /**
   * Sets custom logger service.
   * Flushes buffered logs if auto flush is on.
   * @returns {void}
   */
  public useLogger(logger: LoggerService | LogLevel[] | false) {
	logger.debug(`>>> Entering useLogger(logger=${logger})`);
    Logger.overrideLogger(logger);

    if (this.shouldFlushLogsOnOverride) {
      this.flushLogs();
	logger.debug(`<<< Exiting useLogger(logger=${logger})`);
    }
  }

  /**
   * Prints buffered logs and detaches buffer.
   * @returns {void}
   */
  public flushLogs() {
	logger.debug('>>> Entering flushLogs()');
    Logger.flush();
  }

  /**
   * Define that it must flush logs right after defining a custom logger.
   */
  public flushLogsOnOverride() {
	logger.debug('>>> Entering flushLogsOnOverride()');
    this.shouldFlushLogsOnOverride = true;
	logger.debug(`flushLogsOnOverride(): this.shouldFlushLogsOnOverride → ${this.shouldFlushLogsOnOverride}`);
  }

  /**
   * Enables the usage of shutdown hooks. Will call the
   * `onApplicationShutdown` function of a provider if the
   * process receives a shutdown signal.
   *
   * @param {ShutdownSignal[]} [signals=[]] The system signals it should listen to
   * @param {ShutdownHooksOptions} [options={}] Options for configuring shutdown hooks behavior
   *
   * @returns {this} The Nest application context instance
   */
  public enableShutdownHooks(
    signals: (ShutdownSignal | string)[] = [],
    options: ShutdownHooksOptions = {},
  ): this {
    if (!signals || isEmptyArray(signals)) {
      signals = Object.values(ShutdownSignal);
    } else {
      // given signals array should be unique because
      // process shouldn't listen to the same signal more than once.
      signals = Array.from(new Set(signals));
    }

    signals = iterate(signals)
      .map((signal: string) => signal.toString().toUpperCase().trim())
      // filter out the signals which is already listening to
      .filter(signal => !this.activeShutdownSignals.includes(signal))
      .toArray();

    this.listenToShutdownSignals(signals, options);
	logger.debug(`<<< Exiting enableShutdownHooks(signals=${signals},options=${options})`);
    return this;
  }

  protected async prepareClose(): Promise<void> {
	logger.debug('>>> Entering prepareClose()');
    // Nest application context has no server
    // to signal, therefore just call a noop
	logger.debug('<<< Exiting prepareClose()');
    return Promise.resolve();
  }

  protected async dispose(): Promise<void> {
	logger.debug('>>> Entering dispose()');
    // Nest application context has no server
    // to dispose, therefore just call a noop
	logger.debug('<<< Exiting dispose()');
    return Promise.resolve();
  }

  /**
   * Listens to shutdown signals by listening to
   * process events
   *
   * @param {string[]} signals The system signals it should listen to
   * @param {ShutdownHooksOptions} options Options for configuring shutdown hooks behavior
   */
  protected listenToShutdownSignals(
    signals: string[],
    options: ShutdownHooksOptions = {},
  ) {
	logger.debug(`>>> Entering listenToShutdownSignals(signals=${signals},options=${options})`);
    let receivedSignal = false;
	logger.debug(`listenToShutdownSignals(signals=${signals},options=${options}): receivedSignal → ${receivedSignal}`);
    const cleanup = async (signal: string) => {
	logger.debug(`>>> Entering cleanup(signal=${signal})`);
      try {
        if (receivedSignal) {
          // If we receive another signal while we're waiting
          // for the server to stop, just ignore it.
          return;
        }
        receivedSignal = true;
        await this.initializationPromise;
        await this.prepareClose();
        await this.callDestroyHook();
        await this.callBeforeShutdownHook(signal);
        await this.dispose();
        await this.callShutdownHook(signal);
        signals.forEach(sig => process.removeListener(sig, cleanup));

        if (options.useProcessExit) {
          // Use process.exit() to ensure the 'exit' event is properly triggered.
          // This is required for async loggers (like Pino with transports)
          // to flush their buffers before the process terminates.
          process.exit(0);
        } else {
          process.kill(process.pid, signal);
        }
      } catch (err) {
        Logger.error(
          MESSAGES.ERROR_DURING_SHUTDOWN,
          (err as Error)?.stack,
          NestApplicationContext.name,
        );
	logger.debug(`<<< Exiting cleanup(signal=${signal})`);
        process.exit(1);
      }
    };
    this.shutdownCleanupRef = cleanup as (...args: unknown[]) => unknown;

    signals.forEach((signal: string) => {
      this.activeShutdownSignals.push(signal);
      process.on(signal as any, cleanup);
    });
	logger.debug(`<<< Exiting listenToShutdownSignals(signals=${signals},options=${options})`);
  }

  /**
   * Unsubscribes from shutdown signals (process events)
   */
  protected unsubscribeFromProcessSignals() {
	logger.debug('>>> Entering unsubscribeFromProcessSignals()');
    if (!this.shutdownCleanupRef) {
      return;
    }
    this.activeShutdownSignals.forEach(signal => {
      process.removeListener(signal, this.shutdownCleanupRef!);
    });
	logger.debug('<<< Exiting unsubscribeFromProcessSignals()');
  }

  /**
   * Calls the `onModuleInit` function on the registered
   * modules and its children.
   */
  protected async callInitHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesToTriggerHooksOn();
	logger.debug(`callInitHook(): modulesSortedByDistance → ${modulesSortedByDistance}`);
	logger.debug('>>> Entering callInitHook()');
    for (const module of modulesSortedByDistance) {
      await callModuleInitHook(module);
	logger.debug('<<< Exiting callInitHook()');
    }
  }

  /**
   * Calls the `onModuleDestroy` function on the registered
   * modules and its children.
   */
  protected async callDestroyHook(): Promise<void> {
    const modulesSortedByDistance = [
      ...this.getModulesToTriggerHooksOn(),
    ].reverse();

    for (const module of modulesSortedByDistance) {
	logger.debug('>>> Entering callDestroyHook()');
      await callModuleDestroyHook(module);
	logger.debug('<<< Exiting callDestroyHook()');
    }
  }

  /**
   * Calls the `onApplicationBootstrap` function on the registered
   * modules and its children.
   */
  protected async callBootstrapHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesToTriggerHooksOn();
	logger.debug(`callBootstrapHook(): modulesSortedByDistance → ${modulesSortedByDistance}`);
	logger.debug('>>> Entering callBootstrapHook()');
    for (const module of modulesSortedByDistance) {
      await callModuleBootstrapHook(module);
	logger.debug('<<< Exiting callBootstrapHook()');
    }
  }

  /**
   * Calls the `onApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callShutdownHook(signal?: string): Promise<void> {
    const modulesSortedByDistance = [
      ...this.getModulesToTriggerHooksOn(),
    ].reverse();

    for (const module of modulesSortedByDistance) {
	logger.debug(`>>> Entering callShutdownHook(signal=${signal})`);
      await callAppShutdownHook(module, signal);
	logger.debug(`<<< Exiting callShutdownHook(signal=${signal})`);
    }
  }

  /**
   * Calls the `beforeApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callBeforeShutdownHook(signal?: string): Promise<void> {
    const modulesSortedByDistance = [
      ...this.getModulesToTriggerHooksOn(),
    ].reverse();

    for (const module of modulesSortedByDistance) {
	logger.debug(`>>> Entering callBeforeShutdownHook(signal=${signal})`);
      await callBeforeAppShutdownHook(module, signal);
	logger.debug(`<<< Exiting callBeforeShutdownHook(signal=${signal})`);
    }
  }

  protected assertNotInPreviewMode(methodName: string) {
	logger.debug(`>>> Entering assertNotInPreviewMode(methodName=${methodName})`);
    if (this.appOptions.preview) {
      const error = `Calling the "${methodName}" in the preview mode is not supported.`;
	logger.debug(`assertNotInPreviewMode(methodName=${methodName}): error → ${error}`);
      this.logger.error(error);
	logger.debug(`<<< Exiting assertNotInPreviewMode(methodName=${methodName})`);
      throw new Error(error);
    }
  }

  private getModulesToTriggerHooksOn(): Module[] {
    if (this._moduleRefsForHooksByDistance) {
	logger.debug('>>> Entering getModulesToTriggerHooksOn()');
      return this._moduleRefsForHooksByDistance;
    }
    const modulesContainer = this.container.getModules();
	logger.debug(`getModulesToTriggerHooksOn(): modulesContainer → ${modulesContainer}`);
    const compareFn = (a: Module, b: Module) => b.distance - a.distance;
    const modulesSortedByDistance = Array.from(modulesContainer.values()).sort(
      compareFn,
    );

	logger.debug(`getModulesToTriggerHooksOn(): modulesSortedByDistance → ${modulesSortedByDistance}`);
    this._moduleRefsForHooksByDistance = this.appOptions?.preview
      ? modulesSortedByDistance.filter(moduleRef => moduleRef.initOnPreview)
      : modulesSortedByDistance;
	logger.debug(`getModulesToTriggerHooksOn(): this._moduleRefsForHooksByDistance → ${this._moduleRefsForHooksByDistance}`);
    return this._moduleRefsForHooksByDistance;
  }

  private printInPreviewModeWarning() {
	logger.debug('>>> Entering printInPreviewModeWarning()');
    this.logger.warn('------------------------------------------------');
    this.logger.warn('Application is running in the PREVIEW mode!');
    this.logger.warn('Providers/controllers will not be instantiated.');
    this.logger.warn('------------------------------------------------');
	logger.debug('<<< Exiting printInPreviewModeWarning()');
  }
}
