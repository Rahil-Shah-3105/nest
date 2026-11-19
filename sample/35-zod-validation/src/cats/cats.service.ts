const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
	logger.error(`>>> Entering create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    this.cats.push(cat);
	logger.warn(`<<< Exiting create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
  }

  findAll(): Cat[] {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.cats;
  }
}
