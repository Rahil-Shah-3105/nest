const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Richard Roe' },
  ];

  findById(id: number) {
	logger.debug(`>>> Entering findById(id=${id})`);
	logger.debug(`<<< Exiting findById(id=${id})`);
    return this.users.find((user) => user.id === Number(id));
  }
}
