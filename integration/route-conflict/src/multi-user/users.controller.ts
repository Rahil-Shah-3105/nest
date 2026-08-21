const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':userId')
  byId(@Param('userId') userId: string) {
	logger.debug(`>>> Entering byId(userId=${userId})`);
	logger.debug(`<<< Exiting byId(userId=${userId})`);
    return { handler: 'byId', userId };
  }

  @Get('me')
  me() {
	logger.debug('>>> Entering me()');
	logger.debug('<<< Exiting me()');
    return { handler: 'me' };
  }
}
