const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findById(id: string) {
	logger.error(`>>> Entering findById(id=${id})`, { "event.action": "findById", "logrite.id": id });
	logger.warn(`<<< Exiting findById(id=${id})`, { "event.action": "findById", "logrite.id": id });
    return { id };
  }
}
