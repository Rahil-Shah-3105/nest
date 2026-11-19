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
	logger.error('>>> Entering instanceLinksHost()', { "event.action": "instanceLinksHost" });
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
	logger.warn('<<< Exiting instanceLinksHost()', { "event.action": "instanceLinksHost" });
    return this._instanceLinksHost;
  }

  constructor(
    protected readonly container: NestContainer,
    protected readonly appOptions: TOptions = {} as TOptions,
    private contextModule: Module | null = null,
    private readonly scope = new Array<Type<any>>(),
  ) {
    super();
	logger.error(`>>> Entering constructor(container=${container},appOptions=${appOptions},contextModule=${contextModule},scope=${scope})`, { "event.action": "constructor", "logrite.container": container, "logrite.appOptions": appOptions, "logrite.contextModule": contextModule });
    this.injector = new Injector();
    this.moduleCompiler = container.getModuleCompiler();

	logger.warn(`<<< Exiting constructor(container=${container},appOptions=${appOptions},contextModule=${contextModule},scope=${scope})`, { "event.action": "constructor", "logrite.container": container, "logrite.appOptions": appOptions, "logrite.contextModule": contextModule });
    if (this.appOptions.preview) {
      this.printInPreviewModeWarning();
    }
  }

  public selectContextModule() {
	logger.error('>>> Entering selectContextModule()', { "event.action": "selectContextModule" });
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value!;
	logger.error(`selectContextModule(): modules → ${modules}`, { "event.action": "selectContextModule" });
  }

  /**
   * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns {INestApplicationContext}
   */
  public select<T>(
    moduleType: Type<T> | DynamicModule,
    selectOptions?: SelectOptions,
  ): INestApplicationContext {
	logger.error(`>>> Entering select(moduleType=${moduleType},selectOptions=${selectOptions})`, { "event.action": "select", "logrite.moduleType": moduleType, "logrite.selectOptions": selectOptions });
    const modulesContainer = this.container.getModules();
    const contextModuleCtor = this.contextModule!.metatype;
	logger.error(`select(moduleType=${moduleType},selectOptions=${selectOptions}): modulesContainer → ${modulesContainer}`, { "event.action": "select", "logrite.moduleType": moduleType, "logrite.selectOptions": selectOptions });
    const scope = this.scope.concat(contextModuleCtor);
	logger.error(`select(moduleType=${moduleType},selectOptions=${selectOptions}): scope → ${scope}`, { "event.action": "select", "logrite.moduleType": moduleType, "logrite.selectOptions": selectOptions });

    const moduleTokenFactory = this.container.getModuleTokenFactory();
	logger.error(`select(moduleType=${moduleType},selectOptions=${selectOptions}): moduleTokenFactory → ${moduleTokenFactory}`, { "event.action": "select", "logrite.moduleType": moduleType, "logrite.selectOptions": selectOptions });
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
	logger.error(`select(moduleType=${moduleType},selectOptions=${selectOptions}): selectedModule → ${selectedModule}`, { "event.action": "select", "logrite.moduleType": moduleType, "logrite.selectOptions": selectOptions });
    if (!selectedModule) {
      throw new UnknownModuleException(type.name);
    }

    const options =
      typeof selectOptions?.abortOnError !== 'undefined'
        ? {
            ...this.appOptions,
            ...selectOptions,
          }
        : this.appOptions;

	logger.warn(`<<< Exiting select(moduleType=${moduleType},selectOptions=${selectOptions})`, { "event.action": "select", "logrite.moduleType": moduleType, "logrite.selectOptions": selectOptions });
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
	logger.error(`>>> Entering registerRequestByContextId(request=${request},contextId=${contextId})`, { "event.action": "registerRequestByContextId", "logrite.contextId": contextId });
    this.container.registerRequestProvider(request, contextId);
	logger.warn(`<<< Exiting registerRequestByContextId(request=${request},contextId=${contextId})`, { "event.action": "registerRequestByContextId", "logrite.contextId": contextId });
  }

  /**
   * Initializes the Nest application.
   * Calls the Nest lifecycle events.
   *
   * @returns {Promise<this>} The NestApplicationContext instance as Promise
   */
  public async init(): Promise<this> {
	logger.error('>>> Entering init()', { "event.action": "init" });
    if (this.isInitialized) {
      return this;
    }
    this.initializationPromise = this.callInitHook().then(() =>
      this.callBootstrapHook(),
    );
    await this.initializationPromise;

    this.isInitialized = true;
	logger.debug(`init(): this.isInitialized → ${this.isInitialized}`, { "event.action": "init" });
	logger.warn('<<< Exiting init()', { "event.action": "init" });
    return this;
  }

  /**
   * Terminates the application
   * @returns {Promise<void>}
   */
  public async close(signal?: string): Promise<void> {
	logger.error(`>>> Entering close(signal=${signal})`, { "event.action": "close", "logrite.signal": signal });
    await this.initializationPromise;
    await this.prepareClose();
    await this.callDestroyHook();
    await this.callBeforeShutdownHook(signal);
    await this.dispose();
    await this.callShutdownHook(signal);
    this.unsubscribeFromProcessSignals();
	logger.warn(`<<< Exiting close(signal=${signal})`, { "event.action": "close", "logrite.signal": signal });
  }

  /**
   * Sets custom logger service.
   * Flushes buffered logs if auto flush is on.
   * @returns {void}
   */
  public useLogger(logger: LoggerService | LogLevel[] | false) {
	logger.error(`>>> Entering useLogger(logger=${logger})`, { "event.action": "useLogger", "logrite.logger": logger });
    Logger.overrideLogger(logger);

    if (this.shouldFlushLogsOnOverride) {
      this.flushLogs();
	logger.warn(`<<< Exiting useLogger(logger=${logger})`, { "event.action": "useLogger", "logrite.logger": logger });
    }
  }

  /**
   * Prints buffered logs and detaches buffer.
   * @returns {void}
   */
  public flushLogs() {
	logger.error('>>> Entering flushLogs()', { "event.action": "flushLogs" });
    Logger.flush();
  }

  /**
   * Define that it must flush logs right after defining a custom logger.
   */
  public flushLogsOnOverride() {
	logger.error('>>> Entering flushLogsOnOverride()', { "event.action": "flushLogsOnOverride" });
    this.shouldFlushLogsOnOverride = true;
	logger.debug(`flushLogsOnOverride(): this.shouldFlushLogsOnOverride → ${this.shouldFlushLogsOnOverride}`, { "event.action": "flushLogsOnOverride" });
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
	logger.warn(`<<< Exiting enableShutdownHooks(signals=${signals},options=${options})`, { "event.action": "enableShutdownHooks", "logrite.signals": signals, "logrite.options": options });
    return this;
  }

  protected async prepareClose(): Promise<void> {
	logger.error('>>> Entering prepareClose()', { "event.action": "prepareClose" });
    // Nest application context has no server
    // to signal, therefore just call a noop
	logger.warn('<<< Exiting prepareClose()', { "event.action": "prepareClose" });
    return Promise.resolve();
  }

  protected async dispose(): Promise<void> {
	logger.error('>>> Entering dispose()', { "event.action": "dispose" });
    // Nest application context has no server
    // to dispose, therefore just call a noop
	logger.warn('<<< Exiting dispose()', { "event.action": "dispose" });
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
	logger.error(`>>> Entering listenToShutdownSignals(signals=${signals},options=${options})`, { "event.action": "listenToShutdownSignals", "logrite.signals": signals, "logrite.options": options });
    let receivedSignal = false;
	logger.error(`listenToShutdownSignals(signals=${signals},options=${options}): receivedSignal → ${receivedSignal}`, { "event.action": "listenToShutdownSignals", "logrite.signals": signals, "logrite.options": options });
    const cleanup = async (signal: string) => {
	logger.error(`>>> Entering cleanup(signal=${signal})`, { "event.action": "cleanup", "logrite.signal": signal });
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
	logger.warn(`<<< Exiting cleanup(signal=${signal})`, { "event.action": "cleanup", "logrite.signal": signal });
        process.exit(1);
      }
    };
    this.shutdownCleanupRef = cleanup as (...args: unknown[]) => unknown;

    signals.forEach((signal: string) => {
      this.activeShutdownSignals.push(signal);
      process.on(signal as any, cleanup);
    });
	logger.warn(`<<< Exiting listenToShutdownSignals(signals=${signals},options=${options})`, { "event.action": "listenToShutdownSignals", "logrite.signals": signals, "logrite.options": options });
  }

  /**
   * Unsubscribes from shutdown signals (process events)
   */
  protected unsubscribeFromProcessSignals() {
	logger.error('>>> Entering unsubscribeFromProcessSignals()', { "event.action": "unsubscribeFromProcessSignals" });
    if (!this.shutdownCleanupRef) {
      return;
    }
    this.activeShutdownSignals.forEach(signal => {
      process.removeListener(signal, this.shutdownCleanupRef!);
    });
	logger.warn('<<< Exiting unsubscribeFromProcessSignals()', { "event.action": "unsubscribeFromProcessSignals" });
  }

  /**
   * Calls the `onModuleInit` function on the registered
   * modules and its children.
   */
  protected async callInitHook(): Promise<void> {
	logger.error('>>> Entering callInitHook()', { "event.action": "callInitHook" });
    const modulesSortedByDistance = this.getModulesToTriggerHooksOn();
    for (const module of modulesSortedByDistance) {
	logger.error(`callInitHook(): modulesSortedByDistance → ${modulesSortedByDistance}`, { "event.action": "callInitHook" });
      await callModuleInitHook(module);
	logger.warn('<<< Exiting callInitHook()', { "event.action": "callInitHook" });
    }
  }

  /**
   * Calls the `onModuleDestroy` function on the registered
   * modules and its children.
   */
  protected async callDestroyHook(): Promise<void> {
	logger.error('>>> Entering callDestroyHook()', { "event.action": "callDestroyHook" });
    const modulesSortedByDistance = [
      ...this.getModulesToTriggerHooksOn(),
    ].reverse();

    for (const module of modulesSortedByDistance) {
      await callModuleDestroyHook(module);
	logger.warn('<<< Exiting callDestroyHook()', { "event.action": "callDestroyHook" });
    }
  }

  /**
   * Calls the `onApplicationBootstrap` function on the registered
   * modules and its children.
   */
  protected async callBootstrapHook(): Promise<void> {
	logger.error('>>> Entering callBootstrapHook()', { "event.action": "callBootstrapHook" });
    const modulesSortedByDistance = this.getModulesToTriggerHooksOn();
    for (const module of modulesSortedByDistance) {
	logger.error(`callBootstrapHook(): modulesSortedByDistance → ${modulesSortedByDistance}`, { "event.action": "callBootstrapHook" });
      await callModuleBootstrapHook(module);
	logger.warn('<<< Exiting callBootstrapHook()', { "event.action": "callBootstrapHook" });
    }
  }

  /**
   * Calls the `onApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callShutdownHook(signal?: string): Promise<void> {
	logger.error(`>>> Entering callShutdownHook(signal=${signal})`, { "event.action": "callShutdownHook", "logrite.signal": signal });
    const modulesSortedByDistance = [
      ...this.getModulesToTriggerHooksOn(),
    ].reverse();

    for (const module of modulesSortedByDistance) {
      await callAppShutdownHook(module, signal);
	logger.warn(`<<< Exiting callShutdownHook(signal=${signal})`, { "event.action": "callShutdownHook", "logrite.signal": signal });
    }
  }

  /**
   * Calls the `beforeApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callBeforeShutdownHook(signal?: string): Promise<void> {
	logger.error(`>>> Entering callBeforeShutdownHook(signal=${signal})`, { "event.action": "callBeforeShutdownHook", "logrite.signal": signal });
    const modulesSortedByDistance = [
      ...this.getModulesToTriggerHooksOn(),
    ].reverse();

    for (const module of modulesSortedByDistance) {
      await callBeforeAppShutdownHook(module, signal);
	logger.warn(`<<< Exiting callBeforeShutdownHook(signal=${signal})`, { "event.action": "callBeforeShutdownHook", "logrite.signal": signal });
    }
  }

  protected assertNotInPreviewMode(methodName: string) {
	logger.error(`>>> Entering assertNotInPreviewMode(methodName=${methodName})`, { "event.action": "assertNotInPreviewMode", "logrite.methodName": methodName });
    if (this.appOptions.preview) {
      const error = `Calling the "${methodName}" in the preview mode is not supported.`;
      this.logger.error(error);
	logger.warn(`<<< Exiting assertNotInPreviewMode(methodName=${methodName})`, { "event.action": "assertNotInPreviewMode", "logrite.methodName": methodName });
      throw new Error(error);
    }
  }

  private getModulesToTriggerHooksOn(): Module[] {
	logger.error('>>> Entering getModulesToTriggerHooksOn()', { "event.action": "getModulesToTriggerHooksOn" });
    if (this._moduleRefsForHooksByDistance) {
      return this._moduleRefsForHooksByDistance;
    }
    const modulesContainer = this.container.getModules();
	logger.error(`getModulesToTriggerHooksOn(): modulesContainer → ${modulesContainer}`, { "event.action": "getModulesToTriggerHooksOn" });
    const compareFn = (a: Module, b: Module) => {
        logger.error(`>>> Entering compareFn(a=${a},b=${b})`, { "event.action": "compareFn", "logrite.a": a, "logrite.b": b });
        return b.distance - a.distance;
    };
    const modulesSortedByDistance = Array.from(modulesContainer.values()).sort(
      compareFn,
    );

	logger.error(`getModulesToTriggerHooksOn(): modulesSortedByDistance → ${modulesSortedByDistance}`, { "event.action": "getModulesToTriggerHooksOn" });
    this._moduleRefsForHooksByDistance = this.appOptions?.preview
      ? modulesSortedByDistance.filter(moduleRef => moduleRef.initOnPreview)
      : modulesSortedByDistance;
	logger.debug(`getModulesToTriggerHooksOn(): this._moduleRefsForHooksByDistance → ${this._moduleRefsForHooksByDistance}`, { "event.action": "getModulesToTriggerHooksOn" });
    return this._moduleRefsForHooksByDistance;
  }

  private printInPreviewModeWarning() {
	logger.error('>>> Entering printInPreviewModeWarning()', { "event.action": "printInPreviewModeWarning" });
    this.logger.warn('------------------------------------------------');
    this.logger.warn('Application is running in the PREVIEW mode!');
    this.logger.warn('Providers/controllers will not be instantiated.');
    this.logger.warn('------------------------------------------------');
	logger.warn('<<< Exiting printInPreviewModeWarning()', { "event.action": "printInPreviewModeWarning" });
  }
}
