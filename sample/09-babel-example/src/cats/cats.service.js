const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    this.cats = [];
	logger.debug(`constructor(): this.cats → ${this.cats}`, { "event.action": "constructor" });
  }

  create(cat) {
	logger.error(`>>> Entering create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    this.cats.push(cat);
	logger.warn(`<<< Exiting create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.cats;
  }
}