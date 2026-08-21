const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CatsRequestScopedService {
  static COUNTER = 0;
  private readonly cats: Cat[] = [{ id: 1, name: 'Cat', age: 5 }];

  constructor() {
	logger.debug('>>> Entering constructor()');
    CatsRequestScopedService.COUNTER++;
	logger.debug('<<< Exiting constructor()');
  }

  create(cat: Cat): Cat {
	logger.debug(`>>> Entering create(cat=${cat})`);
    this.cats.push(cat);
	logger.debug(`<<< Exiting create(cat=${cat})`);
    return cat;
  }

  findAll(): Cat[] {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.cats;
  }

  findOneById(id: number): Cat {
	logger.debug(`>>> Entering findOneById(id=${id})`);
	logger.debug(`<<< Exiting findOneById(id=${id})`);
    return this.cats.find(cat => cat.id === id)!;
  }
}
