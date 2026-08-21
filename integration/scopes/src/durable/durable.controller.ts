const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { DurableService } from './durable.service.js';
import { NonDurableService } from './non-durable.service.js';

@Controller('durable')
export class DurableController {
  constructor(
    private readonly durableService: DurableService,
    private readonly nonDurableService: NonDurableService,
  ) {}

  @Get()
  greeting(): string {
	logger.debug('>>> Entering greeting()');
	logger.debug('<<< Exiting greeting()');
    return this.durableService.greeting();
  }

  @Get('echo')
  echo() {
	logger.debug('>>> Entering echo()');
	logger.debug('<<< Exiting echo()');
    return {
      tenantId: this.durableService.getTenantId(),
    };
  }

  @Get('request-context')
  getRequestContext() {
	logger.debug('>>> Entering getRequestContext()');
	logger.debug('<<< Exiting getRequestContext()');
    return {
      durableService: this.durableService.getTenantId(),
      nonDurableService: this.nonDurableService.getTenantId(),
    };
  }
}
