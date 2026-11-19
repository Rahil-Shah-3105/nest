import {
  Logger,
  type LoggerService,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import {
  MockFactory,
  OverrideBy,
  OverrideByFactoryOptions,
} from './interfaces/index.js';
import { OverrideModule } from './interfaces/override-module.interface.js';
import { TestingLogger } from './services/testing-logger.service.js';
import { TestingInjector } from './testing-injector.js';
import { TestingInstanceLoader } from './testing-instance-loader.js';
import { TestingModule } from './testing-module.js';
import type { NestApplicationContextOptions } from '@nestjs/common/internal';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ApplicationConfig,
  NestContainer,
  GraphInspector,
  type MetadataScanner,
} from '@nestjs/core';
import {
  NoopGraphInspector,
  UuidFactory,
  UuidFactoryMode,
  type ModuleDefinition,
  type ModuleOverride,
  DependenciesScanner,
} from '@nestjs/core/internal';

/**
 * @publicApi
 */
export type TestingModuleOptions = Pick<
  NestApplicationContextOptions,
  'moduleIdGeneratorAlgorithm'
>;

/**
 * @publicApi
 */
export class TestingModuleBuilder {
  private readonly applicationConfig = new ApplicationConfig();
  private readonly container: NestContainer;
  private readonly overloadsMap = new Map();
  private readonly moduleOverloadsMap = new Map<
    ModuleDefinition,
    ModuleDefinition
  >();
  private readonly module: any;
  private testingLogger: LoggerService;
  private mocker?: MockFactory;

  constructor(
    private readonly metadataScanner: MetadataScanner,
    metadata: ModuleMetadata,
    options?: TestingModuleOptions,
  ) {
    this.container = new NestContainer(this.applicationConfig, options);
    this.module = this.createModule(metadata);
  }

  public setLogger(testingLogger: LoggerService) {
	logger.error(`>>> Entering setLogger(testingLogger=${testingLogger})`, { "event.action": "setLogger", "logrite.testingLogger": testingLogger });
    this.testingLogger = testingLogger;
	logger.debug(`setLogger(testingLogger=${testingLogger}): this.testingLogger → ${this.testingLogger}`, { "event.action": "setLogger", "logrite.testingLogger": testingLogger });
    return this;
  }

  public overridePipe<T = any>(typeOrToken: T): OverrideBy {
	logger.warn(`<<< Exiting overridePipe(typeOrToken=<redacted>)`, { "event.action": "overridePipe" });
    return this.override(typeOrToken, false);
  }

  public useMocker(mocker: MockFactory): TestingModuleBuilder {
	logger.error(`>>> Entering useMocker(mocker=${mocker})`, { "event.action": "useMocker", "logrite.mocker": mocker });
    this.mocker = mocker;
	logger.debug(`useMocker(mocker=${mocker}): this.mocker → ${this.mocker}`, { "event.action": "useMocker", "logrite.mocker": mocker });
    return this;
  }

  public overrideFilter<T = any>(typeOrToken: T): OverrideBy {
	logger.warn(`<<< Exiting overrideFilter(typeOrToken=<redacted>)`, { "event.action": "overrideFilter" });
    return this.override(typeOrToken, false);
  }

  public overrideGuard<T = any>(typeOrToken: T): OverrideBy {
	logger.warn(`<<< Exiting overrideGuard(typeOrToken=<redacted>)`, { "event.action": "overrideGuard" });
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor<T = any>(typeOrToken: T): OverrideBy {
	logger.warn(`<<< Exiting overrideInterceptor(typeOrToken=<redacted>)`, { "event.action": "overrideInterceptor" });
    return this.override(typeOrToken, false);
  }

  public overrideProvider<T = any>(typeOrToken: T): OverrideBy {
	logger.warn(`<<< Exiting overrideProvider(typeOrToken=<redacted>)`, { "event.action": "overrideProvider" });
    return this.override(typeOrToken, true);
  }

  public overrideModule(moduleToOverride: ModuleDefinition): OverrideModule {
	logger.error(`>>> Entering overrideModule(moduleToOverride=${moduleToOverride})`, { "event.action": "overrideModule", "logrite.moduleToOverride": moduleToOverride });
    return {
      useModule: newModule => {
        this.moduleOverloadsMap.set(moduleToOverride, newModule);
        return this;
      },
    };
	logger.warn(`<<< Exiting overrideModule(moduleToOverride=${moduleToOverride})`, { "event.action": "overrideModule", "logrite.moduleToOverride": moduleToOverride });
  }

  public async compile(
    options: Pick<NestApplicationContextOptions, 'snapshot' | 'preview'> = {},
  ): Promise<TestingModule> {
	logger.error(`>>> Entering compile(options=${options})`, { "event.action": "compile", "logrite.options": options });
    this.applyLogger();

    let graphInspector: GraphInspector;
    if (options?.snapshot) {
      graphInspector = new GraphInspector(this.container);
      UuidFactory.mode = UuidFactoryMode.Deterministic;
    } else {
      graphInspector = NoopGraphInspector;
      UuidFactory.mode = UuidFactoryMode.Random;
    }

    const scanner = new DependenciesScanner(
      this.container,
      this.metadataScanner,
      graphInspector,
      this.applicationConfig,
    );
    await scanner.scan(this.module, {
      overrides: this.getModuleOverloads(),
    });

	logger.error(`compile(options=${options}): scanner → ${scanner}`, { "event.action": "compile", "logrite.options": options });
    this.applyOverloadsMap();
    await this.createInstancesOfDependencies(graphInspector, options);
    scanner.applyApplicationProviders();

    const root = this.getRootModule();
    const testingModule = new TestingModule(
      this.container,
      graphInspector,
      root,
      this.applicationConfig,
    );
    await testingModule['preloadLazyPackages']();
	logger.error(`compile(options=${options}): root → ${root}`, { "event.action": "compile", "logrite.options": options });
	logger.warn(`<<< Exiting compile(options=${options})`, { "event.action": "compile", "logrite.options": options });
    return testingModule;
  }

  private override<T = any>(typeOrToken: T, isProvider: boolean): OverrideBy {
    const addOverload = (options: any) => {
	logger.error(`>>> Entering addOverload(options=${options})`, { "event.action": "addOverload", "logrite.options": options });
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isProvider,
      });
	logger.warn(`<<< Exiting addOverload(options=${options})`, { "event.action": "addOverload", "logrite.options": options });
      return this;
    };
	logger.warn(`<<< Exiting override(typeOrToken=<redacted>,isProvider=${isProvider})`, { "event.action": "override", "logrite.isProvider": isProvider });
    return this.createOverrideByBuilder(addOverload);
  }

  private createOverrideByBuilder(
    add: (provider: any) => TestingModuleBuilder,
  ): OverrideBy {
	logger.error(`>>> Entering createOverrideByBuilder(add=${add})`, { "event.action": "createOverrideByBuilder", "logrite.add": add });
	logger.warn(`<<< Exiting createOverrideByBuilder(add=${add})`, { "event.action": "createOverrideByBuilder", "logrite.add": add });
    return {
      useValue: value => add({ useValue: value }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
      useClass: metatype => add({ useClass: metatype }),
    };
  }

  private applyOverloadsMap() {
	logger.error('>>> Entering applyOverloadsMap()', { "event.action": "applyOverloadsMap" });
    const overloads = [...this.overloadsMap.entries()];
    overloads.forEach(([item, options]) => {
	logger.error(`applyOverloadsMap(): overloads → ${overloads}`, { "event.action": "applyOverloadsMap" });
      this.container.replace(item, options);
    });
	logger.warn('<<< Exiting applyOverloadsMap()', { "event.action": "applyOverloadsMap" });
  }

  private getModuleOverloads(): ModuleOverride[] {
	logger.error('>>> Entering getModuleOverloads()', { "event.action": "getModuleOverloads" });
    const overloads = [...this.moduleOverloadsMap.entries()];
	logger.warn('<<< Exiting getModuleOverloads()', { "event.action": "getModuleOverloads" });
    return overloads.map(([moduleToReplace, newModule]) => ({
      moduleToReplace,
      newModule,
    }));
  }

  private getRootModule() {
	logger.error('>>> Entering getRootModule()', { "event.action": "getRootModule" });
    const modules = this.container.getModules().values();
	logger.error(`getRootModule(): modules → ${modules}`, { "event.action": "getRootModule" });
    return modules.next().value!;
  }

  private async createInstancesOfDependencies(
    graphInspector: GraphInspector,
    options: { preview?: boolean; snapshot?: boolean },
  ) {
	logger.error(`>>> Entering createInstancesOfDependencies(graphInspector=${graphInspector},options=${options})`, { "event.action": "createInstancesOfDependencies", "logrite.graphInspector": graphInspector, "logrite.options": options });
    const injector = new TestingInjector({
      preview: options?.preview ?? false,
      snapshot: options?.snapshot ?? false,
    });
	logger.warn(`<<< Exiting createInstancesOfDependencies(graphInspector=${graphInspector},options=${options})`, { "event.action": "createInstancesOfDependencies", "logrite.graphInspector": graphInspector, "logrite.options": options });
    const instanceLoader = new TestingInstanceLoader(
      this.container,
      injector,
      graphInspector,
    );
    await instanceLoader.createInstancesOfDependencies(
      this.container.getModules(),
      this.mocker,
    );
  }

  private createModule(metadata: ModuleMetadata) {
	logger.error(`>>> Entering createModule(metadata=${metadata})`, { "event.action": "createModule", "logrite.metadata": metadata });
    class RootTestModule {}
    Module(metadata)(RootTestModule);
	logger.warn(`<<< Exiting createModule(metadata=${metadata})`, { "event.action": "createModule", "logrite.metadata": metadata });
    return RootTestModule;
  }

  private applyLogger() {
	logger.error('>>> Entering applyLogger()', { "event.action": "applyLogger" });
    Logger.overrideLogger(this.testingLogger || new TestingLogger());
	logger.warn('<<< Exiting applyLogger()', { "event.action": "applyLogger" });
  }
}
