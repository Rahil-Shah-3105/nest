const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
	logger.debug('>>> Entering getHello()');
	logger.debug('<<< Exiting getHello()');
    return 'Hello, world!';
  }
}
