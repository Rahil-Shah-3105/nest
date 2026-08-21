const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { MockFactory } from './interfaces/index.js';
import { TestingInjector } from './testing-injector.js';
import { InstanceLoader, type Module } from '@nestjs/core/internal';

export class TestingInstanceLoader extends InstanceLoader<TestingInjector> {
  public async createInstancesOfDependencies(
    modules: Map<string, Module> = this.container.getModules(),
    mocker?: MockFactory,
  ): Promise<void> {
	logger.debug(`>>> Entering createInstancesOfDependencies(modules=${modules},mocker=${mocker})`);
    this.injector.setContainer(this.container);
    mocker && this.injector.setMocker(mocker);
    await super.createInstancesOfDependencies();
	logger.debug(`<<< Exiting createInstancesOfDependencies(modules=${modules},mocker=${mocker})`);
  }
}
