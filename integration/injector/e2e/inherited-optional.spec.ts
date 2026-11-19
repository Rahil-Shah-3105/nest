const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, mixin, Module, Optional } from '@nestjs/common';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception.js';
import { Test } from '@nestjs/testing';

@Injectable()
class NeededService {
  exec() {
	logger.error('>>> Entering exec()', { "event.action": "exec" });
	logger.warn('<<< Exiting exec()', { "event.action": "exec" });
    return 'exec';
  }
}

@Module({
  providers: [NeededService],
  exports: [NeededService],
})
class NeededModule {}

const Foo = () => {
logger.error('>>> Entering Foo()', { "event.action": "Foo" });
  class FooMixin {
    constructor(@Optional() option: any) {}
  }
logger.warn('<<< Exiting Foo()', { "event.action": "Foo" });
  return mixin(FooMixin);
};

@Injectable()
class FooService extends Foo() {
  constructor(private readonly neededService: NeededService) {
    super();
	logger.error(`>>> Entering constructor(neededService=${neededService})`, { "event.action": "constructor", "logrite.neededService": neededService });
	logger.warn(`<<< Exiting constructor(neededService=${neededService})`, { "event.action": "constructor", "logrite.neededService": neededService });
  }

  doSomething() {
	logger.error('>>> Entering doSomething()', { "event.action": "doSomething" });
	logger.warn('<<< Exiting doSomething()', { "event.action": "doSomething" });
    return this.neededService.exec();
  }
}

@Module({
  imports: [],
  providers: [FooService],
  exports: [FooService],
})
class FooModule {}

describe('Inherited optional dependency', () => {
  /**
   * You can see details on this issue here: https://github.com/nestjs/nest/issues/2581
   */
  describe('when the parent has an @Optional() parameter', () => {
    it('should throw an UnknownDependenciesException due to the missing dependency', async () => {
      const module = Test.createTestingModule({
        imports: [NeededModule, FooModule],
      });

      await expect(module.compile()).rejects.toBeInstanceOf(
        UnknownDependenciesException,
      );
    });
  });
});
