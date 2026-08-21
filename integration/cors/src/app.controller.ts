const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getGlobals() {
	logger.debug('>>> Entering getGlobals()');
	logger.debug('<<< Exiting getGlobals()');
    return '';
  }
}
