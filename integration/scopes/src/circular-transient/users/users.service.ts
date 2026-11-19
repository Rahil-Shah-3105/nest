const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  static COUNTER = 0;
  constructor(@Inject('META') private readonly meta) {
	logger.error(`>>> Entering constructor(meta=${meta})`, { "event.action": "constructor", "logrite.meta": meta });
    UsersService.COUNTER++;
	logger.warn(`<<< Exiting constructor(meta=${meta})`, { "event.action": "constructor", "logrite.meta": meta });
  }

  findById(id: string) {
	logger.error(`>>> Entering findById(id=${id})`, { "event.action": "findById", "logrite.id": id });
	logger.warn(`<<< Exiting findById(id=${id})`, { "event.action": "findById", "logrite.id": id });
    return { id };
  }
}
