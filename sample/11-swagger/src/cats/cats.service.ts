const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './entities/cat.entity.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: CreateCatDto): Cat {
	logger.debug(`>>> Entering create(cat=${cat})`);
    this.cats.push(cat);
	logger.debug(`<<< Exiting create(cat=${cat})`);
    return cat;
  }

  findOne(id: number): Cat {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return this.cats[id];
  }
}
