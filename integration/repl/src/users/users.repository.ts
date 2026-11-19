const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  async find() {
	logger.error('>>> Entering find()', { "event.action": "find" });
	logger.warn('<<< Exiting find()', { "event.action": "find" });
    return [{ id: 1, email: 'test@nestjs.com' }];
  }
}
