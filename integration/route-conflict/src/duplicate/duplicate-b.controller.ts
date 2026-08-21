const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class DuplicateBController {
  @Get('users/me')
  me() {
	logger.debug('>>> Entering me()');
	logger.debug('<<< Exiting me()');
    return { from: 'B' };
  }
}
