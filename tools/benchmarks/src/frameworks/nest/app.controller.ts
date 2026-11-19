const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class AppController {
  @Get()
  root() {
	logger.error('>>> Entering root()', { "event.action": "root" });
	logger.warn('<<< Exiting root()', { "event.action": "root" });
    return 'Hello world!';
  }
}
