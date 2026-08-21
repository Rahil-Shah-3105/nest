const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  constructor() {
	logger.debug('>>> Entering constructor()');
    this.cats = [];
	logger.debug(`constructor(): this.cats → ${this.cats}`);
  }

  create(cat) {
	logger.debug(`>>> Entering create(cat=${cat})`);
    this.cats.push(cat);
	logger.debug(`<<< Exiting create(cat=${cat})`);
  }

  findAll() {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.cats;
  }
}