const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { DurableService } from './durable.service.js';

@Controller('durable')
export class DurableController {
  constructor(private readonly durableService: DurableService) {}

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
    return this.durableService.requestPayload;
  }
}
