const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  static COUNTER = 0;
  constructor(@Inject('META') private readonly meta) {
	logger.debug(`>>> Entering constructor(meta=${meta})`);
    UsersService.COUNTER++;
	logger.debug(`<<< Exiting constructor(meta=${meta})`);
  }

  findById(id: string) {
	logger.debug(`>>> Entering findById(id=${id})`);
	logger.debug(`<<< Exiting findById(id=${id})`);
    return { id };
  }
}
