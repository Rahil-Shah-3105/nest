const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findById(id: string) {
	logger.debug(`>>> Entering findById(id=${id})`);
	logger.debug(`<<< Exiting findById(id=${id})`);
    return { id };
  }
}
