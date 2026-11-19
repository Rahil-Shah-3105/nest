const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Get, Controller, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index.hbs')
  root() {
	logger.error('>>> Entering root()', { "event.action": "root" });
	logger.warn('<<< Exiting root()', { "event.action": "root" });
    return { message: 'Hello world!' };
  }
}
