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
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
    return this.durableService.greeting();
  }

  @Get('echo')
  echo() {
	logger.error('>>> Entering echo()', { "event.action": "echo" });
	logger.warn('<<< Exiting echo()', { "event.action": "echo" });
    return {
      tenantId: this.durableService.getTenantId(),
    };
  }

  @Get('request-context')
  getRequestContext() {
	logger.error('>>> Entering getRequestContext()', { "event.action": "getRequestContext" });
	logger.warn('<<< Exiting getRequestContext()', { "event.action": "getRequestContext" });
    return {
      durableService: this.durableService.getTenantId(),
      nonDurableService: this.nonDurableService.getTenantId(),
    };
  }
}
