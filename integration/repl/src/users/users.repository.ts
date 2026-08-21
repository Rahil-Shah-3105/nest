const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  async find() {
	logger.debug('>>> Entering find()');
	logger.debug('<<< Exiting find()');
    return [{ id: 1, email: 'test@nestjs.com' }];
  }
}
