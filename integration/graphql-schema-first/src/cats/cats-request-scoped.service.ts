const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CatsRequestScopedService {
  static COUNTER = 0;
  private readonly cats: Cat[] = [{ id: 1, name: 'Cat', age: 5 }];

  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    CatsRequestScopedService.COUNTER++;
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  create(cat: Cat): Cat {
	logger.error(`>>> Entering create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    this.cats.push(cat);
	logger.warn(`<<< Exiting create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    return cat;
  }

  findAll(): Cat[] {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.cats;
  }

  findOneById(id: number): Cat {
	logger.error(`>>> Entering findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
	logger.warn(`<<< Exiting findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
    return this.cats.find(cat => cat.id === id)!;
  }
}
