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
	logger.debug(`>>> Entering setMocker(mocker=${mocker})`);
    this.mocker = mocker;
  }

  public setContainer(container: NestContainer) {
	logger.debug(`>>> Entering setContainer(container=${container})`);
    this.container = container;
	logger.debug(`<<< Exiting setContainer(container=${container})`);
  }

  public async resolveComponentWrapper<T>(
    moduleRef: Module,
    name: any,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: string | number,
  ): Promise<InstanceWrapper> {
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
	logger.debug(`>>> Entering resolveComponentWrapper(moduleRef=${moduleRef},name=${name},dependencyContext=${dependencyContext},wrapper=${wrapper},resolutionContext=${resolutionContext},keyOrIndex=${keyOrIndex})`);
	logger.debug(`<<< Exiting resolveComponentWrapper(moduleRef=${moduleRef},name=${name},dependencyContext=${dependencyContext},wrapper=${wrapper},resolutionContext=${resolutionContext},keyOrIndex=${keyOrIndex})`);
      return this.mockWrapper(err, moduleRef, name, wrapper);
    }
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ): Promise<InstanceWrapper> {
    try {
      const existingProviderWrapper = await super.resolveComponentHost(
        moduleRef,
        instanceWrapper,
        resolutionContext,
      );
      return existingProviderWrapper;
    } catch (err) {
	logger.debug(`>>> Entering resolveComponentHost(moduleRef=${moduleRef},instanceWrapper=${instanceWrapper},resolutionContext=${resolutionContext})`);
		logger.debug(`<<< Exiting resolveComponentHost(moduleRef=${moduleRef},instanceWrapper=${instanceWrapper},resolutionContext=${resolutionContext})`);
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
    if (!this.mocker) {
	logger.debug(`>>> Entering mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper})`);
      throw err;
    }

    const mockedInstance = this.mocker(name);
	logger.debug(`mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper}): mockedInstance → ${mockedInstance}`);
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
	logger.debug(`mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper}): newWrapper → ${newWrapper}`);
	logger.debug(`mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper}): internalCoreModule → ${internalCoreModule}`);
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
	logger.debug(`<<< Exiting mockWrapper(err=${err},moduleRef=${moduleRef},name=${name},wrapper=${wrapper})`);
    return newWrapper;
  }
}
