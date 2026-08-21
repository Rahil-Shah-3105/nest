const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class AppController {
  @Get()
  root() {
	logger.debug('>>> Entering root()');
	logger.debug('<<< Exiting root()');
    return 'Hello world!';
  }
}
