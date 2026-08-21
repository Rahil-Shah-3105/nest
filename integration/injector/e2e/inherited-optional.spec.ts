const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, mixin, Module, Optional } from '@nestjs/common';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception.js';
import { Test } from '@nestjs/testing';

@Injectable()
class NeededService {
  exec() {
	logger.debug('>>> Entering exec()');
	logger.debug('<<< Exiting exec()');
    return 'exec';
  }
}

@Module({
  providers: [NeededService],
  exports: [NeededService],
})
class NeededModule {}

const Foo = () => {
logger.debug('>>> Entering Foo()');
  class FooMixin {
    constructor(@Optional() option: any) {}
  }
logger.debug('<<< Exiting Foo()');
  return mixin(FooMixin);
};

@Injectable()
class FooService extends Foo() {
  constructor(private readonly neededService: NeededService) {
    super();
	logger.debug(`>>> Entering constructor(NeededService=${NeededService})`);
  }

  doSomething() {
	logger.debug('>>> Entering doSomething()');
	logger.debug('<<< Exiting doSomething()');
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
