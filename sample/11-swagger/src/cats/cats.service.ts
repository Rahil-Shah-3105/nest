const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './entities/cat.entity.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: CreateCatDto): Cat {
	logger.error(`>>> Entering create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    this.cats.push(cat);
	logger.warn(`<<< Exiting create(cat=${cat})`, { "event.action": "create", "logrite.cat": cat });
    return cat;
  }

  findOne(id: number): Cat {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.cats[id];
  }
}
