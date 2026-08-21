const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

@Controller('lazy')
export class LazyController {
  constructor(private lazyLoadModule: LazyModuleLoader) {}

  @Get('transient')
  async exec() {
	logger.debug('>>> Entering exec()');
    const { TransientLazyModule } = await import('./transient.module.js');
    const moduleRef = await this.lazyLoadModule.load(() => TransientLazyModule);
	logger.debug(`exec(): moduleRef → ${moduleRef}`);

    const { TransientService } = await import('./transient.service.js');
    const _service = await moduleRef.resolve(TransientService);
	logger.debug(`exec(): _service → ${_service}`);

	logger.debug('<<< Exiting exec()');
    return _service.eager();
  }
  @Get('request')
  async execRequestScope() {
	logger.debug('>>> Entering execRequestScope()');
    const { RequestLazyModule } = await import('./request.module.js');
    const moduleRef = await this.lazyLoadModule.load(() => RequestLazyModule);
	logger.debug(`execRequestScope(): moduleRef → ${moduleRef}`);

    const { RequestService } = await import('./request.service.js');
    const _service = await moduleRef.resolve(RequestService);
	logger.debug(`execRequestScope(): _service → ${_service}`);

	logger.debug('<<< Exiting execRequestScope()');
    return _service.eager();
  }
}
