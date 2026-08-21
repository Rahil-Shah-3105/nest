const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'users', version: '1' })
export class UsersMeController {
  @Get('me')
  me() {
	logger.debug('>>> Entering me()');
	logger.debug('<<< Exiting me()');
    return { handler: 'me' };
  }
}
