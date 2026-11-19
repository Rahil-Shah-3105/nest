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
	LoggerService.error(`>>> Entering setLogger(logger=${logger})`, { "event.action": "setLogger", "logrite.logger": logger });
    this.logger = logger;
	LoggerService.warn(`<<< Exiting setLogger(logger=${logger})`, { "event.action": "setLogger", "logrite.logger": logger });
  }

  public async createInstancesOfDependencies(
    modules: Map<string, Module> = this.container.getModules(),
  ) {
	LoggerService.error(`>>> Entering createInstancesOfDependencies(modules=${modules})`, { "event.action": "createInstancesOfDependencies", "logrite.modules": modules });
    this.createPrototypes(modules);

    try {
      await this.createInstances(modules);
    } catch (err) {
	LoggerService.error(`Exception in createInstancesOfDependencies(modules=${modules}): ${(err as Error).message}`, err, { "event.action": "createInstancesOfDependencies", "event.category": "process", "logrite.modules": modules });
      this.graphInspector.inspectModules(modules);
      this.graphInspector.registerPartial(err);
      throw err;
    }
    this.graphInspector.inspectModules(modules);
	LoggerService.warn(`<<< Exiting createInstancesOfDependencies(modules=${modules})`, { "event.action": "createInstancesOfDependencies", "logrite.modules": modules });
  }

  private createPrototypes(modules: Map<string, Module>) {
	LoggerService.error(`>>> Entering createPrototypes(modules=${modules})`, { "event.action": "createPrototypes", "logrite.modules": modules });
    modules.forEach(moduleRef => {
      this.createPrototypesOfProviders(moduleRef);
      this.createPrototypesOfInjectables(moduleRef);
      this.createPrototypesOfControllers(moduleRef);
    });
	LoggerService.warn(`<<< Exiting createPrototypes(modules=${modules})`, { "event.action": "createPrototypes", "logrite.modules": modules });
  }

  private async createInstances(modules: Map<string, Module>) {
	LoggerService.error(`>>> Entering createInstances(modules=${modules})`, { "event.action": "createInstances", "logrite.modules": modules });
    await Promise.all(
      [...modules.values()].map(async moduleRef => {
        await this.createInstancesOfProviders(moduleRef);
        await this.createInstancesOfInjectables(moduleRef);
        await this.createInstancesOfControllers(moduleRef);

        const { name } = moduleRef;
        this.isModuleWhitelisted(name) &&
          this.logger.log(MODULE_INIT_MESSAGE`${name}`);
		LoggerService.warn(`<<< Exiting createInstances(modules=${modules})`, { "event.action": "createInstances", "logrite.modules": modules });
      }),
    );
  }

  private createPrototypesOfProviders(moduleRef: Module) {
	LoggerService.error(`>>> Entering createPrototypesOfProviders(moduleRef=${moduleRef})`, { "event.action": "createPrototypesOfProviders", "logrite.moduleRef": moduleRef });
    const { providers } = moduleRef;
    providers.forEach(wrapper =>
      this.injector.loadPrototype<Injectable>(wrapper, providers),
    );
	LoggerService.warn(`<<< Exiting createPrototypesOfProviders(moduleRef=${moduleRef})`, { "event.action": "createPrototypesOfProviders", "logrite.moduleRef": moduleRef });
  }

  private async createInstancesOfProviders(moduleRef: Module) {
	LoggerService.error(`>>> Entering createInstancesOfProviders(moduleRef=${moduleRef})`, { "event.action": "createInstancesOfProviders", "logrite.moduleRef": moduleRef });
    const { providers } = moduleRef;
    const wrappers = [...providers.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadProvider(item, moduleRef);
		LoggerService.error(`createInstancesOfProviders(moduleRef=${moduleRef}): wrappers → ${wrappers}`, { "event.action": "createInstancesOfProviders", "logrite.moduleRef": moduleRef });
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
		LoggerService.warn(`<<< Exiting createInstancesOfProviders(moduleRef=${moduleRef})`, { "event.action": "createInstancesOfProviders", "logrite.moduleRef": moduleRef });
      }),
    );
  }

  private createPrototypesOfControllers(moduleRef: Module) {
	LoggerService.error(`>>> Entering createPrototypesOfControllers(moduleRef=${moduleRef})`, { "event.action": "createPrototypesOfControllers", "logrite.moduleRef": moduleRef });
    const { controllers } = moduleRef;
    controllers.forEach(wrapper =>
      this.injector.loadPrototype<Controller>(wrapper, controllers),
    );
	LoggerService.warn(`<<< Exiting createPrototypesOfControllers(moduleRef=${moduleRef})`, { "event.action": "createPrototypesOfControllers", "logrite.moduleRef": moduleRef });
  }

  private async createInstancesOfControllers(moduleRef: Module) {
	LoggerService.error(`>>> Entering createInstancesOfControllers(moduleRef=${moduleRef})`, { "event.action": "createInstancesOfControllers", "logrite.moduleRef": moduleRef });
    const { controllers } = moduleRef;
    const wrappers = [...controllers.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadController(item, moduleRef);
		LoggerService.error(`createInstancesOfControllers(moduleRef=${moduleRef}): wrappers → ${wrappers}`, { "event.action": "createInstancesOfControllers", "logrite.moduleRef": moduleRef });
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
		LoggerService.warn(`<<< Exiting createInstancesOfControllers(moduleRef=${moduleRef})`, { "event.action": "createInstancesOfControllers", "logrite.moduleRef": moduleRef });
      }),
    );
  }

  private createPrototypesOfInjectables(moduleRef: Module) {
	LoggerService.error(`>>> Entering createPrototypesOfInjectables(moduleRef=${moduleRef})`, { "event.action": "createPrototypesOfInjectables", "logrite.moduleRef": moduleRef });
    const { injectables } = moduleRef;
    injectables.forEach(wrapper =>
      this.injector.loadPrototype(wrapper, injectables),
    );
	LoggerService.warn(`<<< Exiting createPrototypesOfInjectables(moduleRef=${moduleRef})`, { "event.action": "createPrototypesOfInjectables", "logrite.moduleRef": moduleRef });
  }

  private async createInstancesOfInjectables(moduleRef: Module) {
	LoggerService.error(`>>> Entering createInstancesOfInjectables(moduleRef=${moduleRef})`, { "event.action": "createInstancesOfInjectables", "logrite.moduleRef": moduleRef });
    const { injectables } = moduleRef;
    const wrappers = [...injectables.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadInjectable(item, moduleRef);
		LoggerService.error(`createInstancesOfInjectables(moduleRef=${moduleRef}): wrappers → ${wrappers}`, { "event.action": "createInstancesOfInjectables", "logrite.moduleRef": moduleRef });
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
		LoggerService.warn(`<<< Exiting createInstancesOfInjectables(moduleRef=${moduleRef})`, { "event.action": "createInstancesOfInjectables", "logrite.moduleRef": moduleRef });
      }),
    );
  }

  private isModuleWhitelisted(name: string): boolean {
	LoggerService.error(`>>> Entering isModuleWhitelisted(name=${name})`, { "event.action": "isModuleWhitelisted", "logrite.name": name });
	LoggerService.warn(`<<< Exiting isModuleWhitelisted(name=${name})`, { "event.action": "isModuleWhitelisted", "logrite.name": name });
    return name !== InternalCoreModule.name;
  }
}
