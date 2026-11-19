const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class DuplicateBController {
  @Get('users/me')
  me() {
	logger.error('>>> Entering me()', { "event.action": "me" });
	logger.warn('<<< Exiting me()', { "event.action": "me" });
    return { from: 'B' };
  }
}
