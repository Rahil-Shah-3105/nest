const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getGlobals() {
	logger.error('>>> Entering getGlobals()', { "event.action": "getGlobals" });
	logger.warn('<<< Exiting getGlobals()', { "event.action": "getGlobals" });
    return '';
  }
}
