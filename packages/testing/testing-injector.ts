import type { NestContainer } from '@nestjs/core';
import type { ContextId } from '@nestjs/core/injector/instance-wrapper.js';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { MockFactory } from './interfaces/index.js';
import {
  STATIC_CONTEXT,
  Injector,
  type InjectorDependencyContext,
  InstanceWrapper,
  type Module,
} from '@nestjs/core/internal';

interface ResolutionContext {
  contextId: ContextId;
  inquirer?: InstanceWrapper;
  effectiveInquirerId?: string;
}

/**
 * @publicApi
 */
export class TestingInjector extends Injector {
  protected mocker?: MockFactory;
  protected container: NestContainer;

  public setMocker(mocker: MockFactory) {
	logger.error(`>>> Entering setMocker(mocker=${mocker})`, { "event.action": "setMocker", "logrite.mocker": mocker });
    this.mocker = mocker;
	logger.debug(`setMocker(mocker=${mocker}): this.mocker → ${this.mocker}`, { "event.action": "setMocker", "logrite.mocker": mocker });
	logger.warn(`<<< Exiting setMocker(mocker=${mocker})`, { "event.action": "setMocker", "logrite.mocker": mocker });
  }

  public setContainer(container: NestContainer) {
	logger.error(`>>> Entering setContainer(container=${container})`, { "event.action": "setContainer", "logrite.container": container });
    this.container = container;
	logger.debug(`setContainer(container=${container}): this.container → ${this.container}`, { "event.action": "setContainer", "logrite.container": container });
	logger.warn(`<<< Exiting setContainer(container=${container})`, { "event.action": "setContainer", "logrite.container": container });
  }

  public async resolveComponentWrapper<T>(
    moduleRef: Module,
    name: any,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: string | number,
  ): Promise<InstanceWrapper> {
	logger.error(`>>> Entering resolveComponentWrapper(moduleRef=${moduleRef},name=${name},dependencyContext=${dependencyContext},wrapper=${wrapper},resolutionContext=${resolutionContext},keyOrIndex=${keyOrIndex})`, { "event.action": "resolveComponentWrapper", "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper, "logrite.keyOrIndex": keyOrIndex });
    try {
      const existingProviderWrapper = await super.resolveComponentWrapper(
        moduleRef,
        name,
        dependencyContext,
        wrapper,
        resolutionContext,
        keyOrIndex,
      );
      return existingProviderWrapper;
    } catch (err) {
	logger.error(`Exception in resolveComponentWrapper(moduleRef=${moduleRef},name=${name},dependencyContext=${dependencyContext},wrapper=${wrapper},resolutionContext=${resolutionContext},keyOrIndex=${keyOrIndex}): ${(err as Error).message}`, err, { "event.action": "resolveComponentWrapper", "event.category": "process", "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper, "logrite.keyOrIndex": keyOrIndex });
	logger.warn(`<<< Exiting resolveComponentWrapper(moduleRef=${moduleRef},name=${name},dependencyContext=${dependencyContext},wrapper=${wrapper},resolutionContext=${resolutionContext},keyOrIndex=${keyOrIndex})`, { "event.action": "resolveComponentWrapper", "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper, "logrite.keyOrIndex": keyOrIndex });
      return this.mockWrapper(err, moduleRef, name, wrapper);
    }
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ): Promise<InstanceWrapper> {
	logger.error(`>>> Entering resolveComponentHost(moduleRef=${moduleRef},instanceWrapper=${instanceWrapper},resolutionContext=${resolutionContext})`, { "event.action": "resolveComponentHost", "logrite.moduleRef": moduleRef, "logrite.instanceWrapper": instanceWrapper });
    try {
      const existingProviderWrapper = await super.resolveComponentHost(
        moduleRef,
        instanceWrapper,
        resolutionContext,
      );
      return existingProviderWrapper;
    } catch (err) {
	logger.error(`Exception in resolveComponentHost(moduleRef=${moduleRef},instanceWrapper=${instanceWrapper},resolutionContext=${resolutionContext}): ${(err as Error).message}`, err, { "event.action": "resolveComponentHost", "event.category": "process", "logrite.moduleRef": moduleRef, "logrite.instanceWrapper": instanceWrapper });
		logger.warn(`<<< Exiting resolveComponentHost(moduleRef=${moduleRef},instanceWrapper=${instanceWrapper},resolutionContext=${resolutionContext})`, { "event.action": "resolveComponentHost", "logrite.moduleRef": moduleRef, "logrite.instanceWrapper": instanceWrapper });
      return this.mockWrapper(
        err,
        moduleRef,
        instanceWrapper.name,
        instanceWrapper,
      );
    }
  }

  private async mockWrapper<T>(
    err: Error,
    moduleRef: Module,
    name: any,
    wrapper: InstanceWrapper<T>,
  ): Promise<InstanceWrapper> {
	logger.error(`>>> Entering mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper})`, { "event.action": "mockWrapper", "logrite.err": err, "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper });
    if (!this.mocker) {
      throw err;
    }

    const mockedInstance = this.mocker(name);
	logger.error(`mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper}): mockedInstance → ${mockedInstance}`, { "event.action": "mockWrapper", "logrite.err": err, "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper });
    if (!mockedInstance) {
      throw err;
    }
    const newWrapper = new InstanceWrapper({
      name,
      isAlias: false,
      scope: wrapper.scope,
      instance: mockedInstance,
      isResolved: true,
      host: moduleRef,
      metatype: wrapper.metatype,
    });
    const internalCoreModule = this.container.getInternalCoreModuleRef();
	logger.error(`mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper}): newWrapper → ${newWrapper}`, { "event.action": "mockWrapper", "logrite.err": err, "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper });
	logger.error(`mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper}): internalCoreModule → ${internalCoreModule}`, { "event.action": "mockWrapper", "logrite.err": err, "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper });
    if (!internalCoreModule) {
      throw new Error(
        'Expected to have internal core module reference at this point.',
      );
    }

    internalCoreModule.addCustomProvider(
      {
        provide: name,
        useValue: mockedInstance,
      },
      internalCoreModule.providers,
    );
    internalCoreModule.addExportedProviderOrModule(name);
	logger.warn(`<<< Exiting mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper})`, { "event.action": "mockWrapper", "logrite.err": err, "logrite.moduleRef": moduleRef, "logrite.name": name, "logrite.wrapper": wrapper });
    return newWrapper;
  }
}
