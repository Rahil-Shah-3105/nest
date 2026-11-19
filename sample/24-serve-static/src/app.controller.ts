const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
	logger.error('>>> Entering getHello()', { "event.action": "getHello" });
	logger.warn('<<< Exiting getHello()', { "event.action": "getHello" });
    return 'Hello, world!';
  }
}
