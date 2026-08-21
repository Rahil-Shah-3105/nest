import { Logger, type LoggerService } from '@nestjs/common';
import { MODULE_INIT_MESSAGE } from '../helpers/messages.js';
import { GraphInspector } from '../inspector/graph-inspector.js';
import { NestContainer } from './container.js';
import { Injector } from './injector.js';
import { InternalCoreModule } from './internal-core-module/internal-core-module.js';
import { Module } from './module.js';
import type { Controller, Injectable } from '@nestjs/common/internal';

export class InstanceLoader<TInjector extends Injector = Injector> {
  constructor(
    protected readonly container: NestContainer,
    protected readonly injector: TInjector,
    protected readonly graphInspector: GraphInspector,
    private logger: LoggerService = new Logger(InstanceLoader.name, {
      timestamp: true,
    }),
  ) {}

  public setLogger(logger: Logger) {
	LoggerService.debug(`>>> Entering setLogger(logger=${logger})`);
    this.logger = logger;
	LoggerService.debug(`<<< Exiting setLogger(logger=${logger})`);
  }

  public async createInstancesOfDependencies(
    modules: Map<string, Module> = this.container.getModules(),
  ) {
	LoggerService.debug(`>>> Entering createInstancesOfDependencies(modules=${modules})`);
    this.createPrototypes(modules);

    try {
      await this.createInstances(modules);
    } catch (err) {
	LoggerService.error(`Exception in createInstancesOfDependencies(modules=${modules}): ${(err as Error).message}`, err);
      this.graphInspector.inspectModules(modules);
      this.graphInspector.registerPartial(err);
      throw err;
    }
    this.graphInspector.inspectModules(modules);
	LoggerService.debug(`<<< Exiting createInstancesOfDependencies(modules=${modules})`);
  }

  private createPrototypes(modules: Map<string, Module>) {
	LoggerService.debug(`>>> Entering createPrototypes(modules=${modules})`);
    modules.forEach(moduleRef => {
      this.createPrototypesOfProviders(moduleRef);
      this.createPrototypesOfInjectables(moduleRef);
      this.createPrototypesOfControllers(moduleRef);
    });
	LoggerService.debug(`<<< Exiting createPrototypes(modules=${modules})`);
  }

  private async createInstances(modules: Map<string, Module>) {
	LoggerService.debug(`>>> Entering createInstances(modules=${modules})`);
    await Promise.all(
      [...modules.values()].map(async moduleRef => {
        await this.createInstancesOfProviders(moduleRef);
        await this.createInstancesOfInjectables(moduleRef);
        await this.createInstancesOfControllers(moduleRef);

        const { name } = moduleRef;
        this.isModuleWhitelisted(name) &&
          this.logger.log(MODULE_INIT_MESSAGE`${name}`);
		LoggerService.debug(`<<< Exiting createInstances(modules=${modules})`);
      }),
    );
  }

  private createPrototypesOfProviders(moduleRef: Module) {
	LoggerService.debug(`>>> Entering createPrototypesOfProviders(moduleRef=${moduleRef})`);
    const { providers } = moduleRef;
    providers.forEach(wrapper =>
      this.injector.loadPrototype<Injectable>(wrapper, providers),
    );
	LoggerService.debug(`<<< Exiting createPrototypesOfProviders(moduleRef=${moduleRef})`);
  }

  private async createInstancesOfProviders(moduleRef: Module) {
	LoggerService.debug(`>>> Entering createInstancesOfProviders(moduleRef=${moduleRef})`);
    const { providers } = moduleRef;
    const wrappers = [...providers.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadProvider(item, moduleRef);
		LoggerService.debug(`createInstancesOfProviders(moduleRef=${moduleRef}): wrappers → ${wrappers}`);
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
		LoggerService.debug(`<<< Exiting createInstancesOfProviders(moduleRef=${moduleRef})`);
      }),
    );
  }

  private createPrototypesOfControllers(moduleRef: Module) {
	LoggerService.debug(`>>> Entering createPrototypesOfControllers(moduleRef=${moduleRef})`);
    const { controllers } = moduleRef;
    controllers.forEach(wrapper =>
      this.injector.loadPrototype<Controller>(wrapper, controllers),
    );
	LoggerService.debug(`<<< Exiting createPrototypesOfControllers(moduleRef=${moduleRef})`);
  }

  private async createInstancesOfControllers(moduleRef: Module) {
	LoggerService.debug(`>>> Entering createInstancesOfControllers(moduleRef=${moduleRef})`);
    const { controllers } = moduleRef;
    const wrappers = [...controllers.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadController(item, moduleRef);
		LoggerService.debug(`createInstancesOfControllers(moduleRef=${moduleRef}): wrappers → ${wrappers}`);
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
		LoggerService.debug(`<<< Exiting createInstancesOfControllers(moduleRef=${moduleRef})`);
      }),
    );
  }

  private createPrototypesOfInjectables(moduleRef: Module) {
	LoggerService.debug(`>>> Entering createPrototypesOfInjectables(moduleRef=${moduleRef})`);
    const { injectables } = moduleRef;
    injectables.forEach(wrapper =>
      this.injector.loadPrototype(wrapper, injectables),
    );
	LoggerService.debug(`<<< Exiting createPrototypesOfInjectables(moduleRef=${moduleRef})`);
  }

  private async createInstancesOfInjectables(moduleRef: Module) {
	LoggerService.debug(`>>> Entering createInstancesOfInjectables(moduleRef=${moduleRef})`);
    const { injectables } = moduleRef;
    const wrappers = [...injectables.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadInjectable(item, moduleRef);
		LoggerService.debug(`createInstancesOfInjectables(moduleRef=${moduleRef}): wrappers → ${wrappers}`);
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
		LoggerService.debug(`<<< Exiting createInstancesOfInjectables(moduleRef=${moduleRef})`);
      }),
    );
  }

  private isModuleWhitelisted(name: string): boolean {
	LoggerService.debug(`>>> Entering isModuleWhitelisted(name=${name})`);
	LoggerService.debug(`<<< Exiting isModuleWhitelisted(name=${name})`);
    return name !== InternalCoreModule.name;
  }
}
