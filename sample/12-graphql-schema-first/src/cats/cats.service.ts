const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Cat } from '../graphql.schema.js';

@Injectable()
export class CatsService {
  private readonly cats: Array<Cat & { ownerId?: number }> = [
    { id: 1, name: 'Cat', age: 5, ownerId: 1 },
  ];

  create(cat: Cat): Cat {
	logger.error(`>>> Entering create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    cat.id = this.cats.length + 1;
	logger.debug(`create(cat=${cat}): cat.id → ${cat.id}`, { "event.action": "create", "logrite.cat": cat });
    this.cats.push(cat);
	logger.warn(`<<< Exiting create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    return cat;
  }

  findAll(): Cat[] {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.cats;
  }

  findOneById(id: number): Cat | undefined {
	logger.error(`>>> Entering findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
	logger.warn(`<<< Exiting findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
    return this.cats.find(cat => cat.id === id);
  }
}
