const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Get, Controller, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index.hbs')
  root() {
	logger.debug('>>> Entering root()');
	logger.debug('<<< Exiting root()');
    return { message: 'Hello world!' };
  }
}
