const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { User } from './models/user.model.js';

@Injectable()
export class UsersService {
  private users: User[] = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Richard Roe' },
  ];

  findById(id: number): User {
	logger.debug(`>>> Entering findById(id=${id})`);
	logger.debug(`<<< Exiting findById(id=${id})`);
    return this.users.find((user) => user.id === Number(id));
  }
}
