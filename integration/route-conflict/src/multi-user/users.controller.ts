const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':userId')
  byId(@Param('userId') userId: string) {
	logger.error(`>>> Entering byId(userId=${userId})`, { "event.action": "byId", "user.name": String(userId) });
	logger.warn(`<<< Exiting byId(userId=${userId})`, { "event.action": "byId", "user.name": String(userId) });
    return { handler: 'byId', userId };
  }

  @Get('me')
  me() {
	logger.error('>>> Entering me()', { "event.action": "me" });
	logger.warn('<<< Exiting me()', { "event.action": "me" });
    return { handler: 'me' };
  }
}
