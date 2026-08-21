const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { DurableService } from './durable.service.js';

@Controller('durable')
export class DurableController {
  constructor(private readonly durableService: DurableService) {}

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
    return this.durableService.requestPayload;
  }
}
