const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'users', version: '1' })
export class UsersMeController {
  @Get('me')
  me() {
	logger.error('>>> Entering me()', { "event.action": "me" });
	logger.warn('<<< Exiting me()', { "event.action": "me" });
    return { handler: 'me' };
  }
}
