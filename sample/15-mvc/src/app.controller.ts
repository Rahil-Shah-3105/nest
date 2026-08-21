const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  root() {
	logger.debug('>>> Entering root()');
	logger.debug('<<< Exiting root()');
    return { message: 'Hello world!' };
  }
}
