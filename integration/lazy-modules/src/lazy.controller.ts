const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

@Controller('lazy')
export class LazyController {
  constructor(private lazyLoadModule: LazyModuleLoader) {}

  @Get('transient')
  async exec() {
	logger.error('>>> Entering exec()', { "event.action": "exec" });
    const { TransientLazyModule } = await import('./transient.module.js');
    const moduleRef = await this.lazyLoadModule.load(() => TransientLazyModule);
	logger.error(`exec(): moduleRef → ${moduleRef}`, { "event.action": "exec" });

    const { TransientService } = await import('./transient.service.js');
    const _service = await moduleRef.resolve(TransientService);
	logger.error(`exec(): _service → ${_service}`, { "event.action": "exec" });

	logger.warn('<<< Exiting exec()', { "event.action": "exec" });
    return _service.eager();
  }
  @Get('request')
  async execRequestScope() {
	logger.error('>>> Entering execRequestScope()', { "event.action": "execRequestScope" });
    const { RequestLazyModule } = await import('./request.module.js');
    const moduleRef = await this.lazyLoadModule.load(() => RequestLazyModule);
	logger.error(`execRequestScope(): moduleRef → ${moduleRef}`, { "event.action": "execRequestScope" });

    const { RequestService } = await import('./request.service.js');
    const _service = await moduleRef.resolve(RequestService);
	logger.error(`execRequestScope(): _service → ${_service}`, { "event.action": "execRequestScope" });

	logger.warn('<<< Exiting execRequestScope()', { "event.action": "execRequestScope" });
    return _service.eager();
  }
}
