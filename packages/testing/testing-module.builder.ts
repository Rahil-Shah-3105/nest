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
	logger.debug(`>>> Entering setLogger(testingLogger=${testingLogger})`);
    this.testingLogger = testingLogger;
    return this;
  }

  public overridePipe<T = any>(typeOrToken: T): OverrideBy {
	logger.debug(`<<< Exiting overridePipe(typeOrToken=<redacted>)`);
    return this.override(typeOrToken, false);
  }

  public useMocker(mocker: MockFactory): TestingModuleBuilder {
	logger.debug(`>>> Entering useMocker(mocker=${mocker})`);
    this.mocker = mocker;
	logger.debug(`useMocker(mocker=${mocker}): this.mocker → ${this.mocker}`);
    return this;
  }

  public overrideFilter<T = any>(typeOrToken: T): OverrideBy {
	logger.debug(`<<< Exiting overrideFilter(typeOrToken=<redacted>)`);
    return this.override(typeOrToken, false);
  }

  public overrideGuard<T = any>(typeOrToken: T): OverrideBy {
	logger.debug(`<<< Exiting overrideGuard(typeOrToken=<redacted>)`);
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor<T = any>(typeOrToken: T): OverrideBy {
	logger.debug(`<<< Exiting overrideInterceptor(typeOrToken=<redacted>)`);
    return this.override(typeOrToken, false);
  }

  public overrideProvider<T = any>(typeOrToken: T): OverrideBy {
	logger.debug(`<<< Exiting overrideProvider(typeOrToken=<redacted>)`);
    return this.override(typeOrToken, true);
  }

  public overrideModule(moduleToOverride: ModuleDefinition): OverrideModule {
	logger.debug(`>>> Entering overrideModule(moduleToOverride=${moduleToOverride})`);
    return {
      useModule: newModule => {
        this.moduleOverloadsMap.set(moduleToOverride, newModule);
        return this;
      },
    };
	logger.debug(`<<< Exiting overrideModule(moduleToOverride=${moduleToOverride})`);
  }

  public async compile(
    options: Pick<NestApplicationContextOptions, 'snapshot' | 'preview'> = {},
  ): Promise<TestingModule> {
    this.applyLogger();

    let graphInspector: GraphInspector;
    if (options?.snapshot) {
	logger.debug(`>>> Entering compile(options=${options})`);
      graphInspector = new GraphInspector(this.container);
      UuidFactory.mode = UuidFactoryMode.Deterministic;
    } else {
	logger.debug(`compile(options=${options}): UuidFactory.mode → ${UuidFactory.mode}`);
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

	logger.debug(`compile(options=${options}): scanner → ${scanner}`);
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
	logger.warn(`compile(options=${options}): root → ${root}`);
	logger.debug(`<<< Exiting compile(options=${options})`);
    return testingModule;
  }

  private override<T = any>(typeOrToken: T, isProvider: boolean): OverrideBy {
    const addOverload = (options: any) => {
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isProvider,
      });
	logger.debug(`>>> Entering addOverload(options=${options})`);
	logger.debug(`<<< Exiting addOverload(options=${options})`);
      return this;
    };
	logger.debug(`<<< Exiting override(typeOrToken=<redacted>,isProvider=${isProvider})`);
    return this.createOverrideByBuilder(addOverload);
  }

  private createOverrideByBuilder(
    add: (provider: any) => TestingModuleBuilder,
  ): OverrideBy {
	logger.debug(`>>> Entering createOverrideByBuilder(add=${add})`);
	logger.debug(`<<< Exiting createOverrideByBuilder(add=${add})`);
    return {
      useValue: value => add({ useValue: value }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
      useClass: metatype => add({ useClass: metatype }),
    };
  }

  private applyOverloadsMap() {
	logger.debug('>>> Entering applyOverloadsMap()');
    const overloads = [...this.overloadsMap.entries()];
    overloads.forEach(([item, options]) => {
	logger.debug(`applyOverloadsMap(): overloads → ${overloads}`);
      this.container.replace(item, options);
    });
	logger.debug('<<< Exiting applyOverloadsMap()');
  }

  private getModuleOverloads(): ModuleOverride[] {
	logger.debug('>>> Entering getModuleOverloads()');
    const overloads = [...this.moduleOverloadsMap.entries()];
	logger.debug('<<< Exiting getModuleOverloads()');
    return overloads.map(([moduleToReplace, newModule]) => ({
      moduleToReplace,
      newModule,
    }));
  }

  private getRootModule() {
	logger.debug('>>> Entering getRootModule()');
    const modules = this.container.getModules().values();
	logger.debug(`getRootModule(): modules → ${modules}`);
    return modules.next().value!;
  }

  private async createInstancesOfDependencies(
    graphInspector: GraphInspector,
    options: { preview?: boolean; snapshot?: boolean },
  ) {
	logger.debug(`>>> Entering createInstancesOfDependencies(graphInspector=${graphInspector},options=${options})`);
    const injector = new TestingInjector({
      preview: options?.preview ?? false,
      snapshot: options?.snapshot ?? false,
    });
	logger.debug(`<<< Exiting createInstancesOfDependencies(graphInspector=${graphInspector},options=${options})`);
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
	logger.debug(`>>> Entering createModule(metadata=${metadata})`);
    class RootTestModule {}
    Module(metadata)(RootTestModule);
	logger.debug(`<<< Exiting createModule(metadata=${metadata})`);
    return RootTestModule;
  }

  private applyLogger() {
	logger.debug('>>> Entering applyLogger()');
    Logger.overrideLogger(this.testingLogger || new TestingLogger());
	logger.debug('<<< Exiting applyLogger()');
  }
}
