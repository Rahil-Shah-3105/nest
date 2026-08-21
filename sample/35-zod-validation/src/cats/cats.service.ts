const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
	logger.debug(`>>> Entering create(cat=${cat})`);
    this.cats.push(cat);
	logger.debug(`<<< Exiting create(cat=${cat})`);
  }

  findAll(): Cat[] {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.cats;
  }
}
