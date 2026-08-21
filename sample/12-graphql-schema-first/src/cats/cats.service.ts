const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Cat } from '../graphql.schema.js';

@Injectable()
export class CatsService {
  private readonly cats: Array<Cat & { ownerId?: number }> = [
    { id: 1, name: 'Cat', age: 5, ownerId: 1 },
  ];

  create(cat: Cat): Cat {
	logger.debug(`>>> Entering create(cat=${cat})`);
    cat.id = this.cats.length + 1;
    this.cats.push(cat);
	logger.debug(`create(cat=${cat}): cat.id → ${cat.id}`);
	logger.debug(`<<< Exiting create(cat=${cat})`);
    return cat;
  }

  findAll(): Cat[] {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.cats;
  }

  findOneById(id: number): Cat | undefined {
	logger.debug(`>>> Entering findOneById(id=${id})`);
	logger.debug(`<<< Exiting findOneById(id=${id})`);
    return this.cats.find(cat => cat.id === id);
  }
}
