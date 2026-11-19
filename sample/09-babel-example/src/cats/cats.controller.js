const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Controller,
  Get,
  Post,
  Body,
  Bind,
  Dependencies,
  Param,
} from '@nestjs/common';
import { CatsService } from './cats.service.js';

@Controller('cats')
@Dependencies(CatsService)
export class CatsController {
  constructor(catsService) {
	logger.error(`>>> Entering constructor(catsService=${catsService})`, { "event.action": "constructor", "logrite.catsService": catsService });
    this.catsService = catsService;
	logger.debug(`constructor(catsService=${catsService}): this.catsService → ${this.catsService}`, { "event.action": "constructor", "logrite.catsService": catsService });
  }

  @Post()
  @Bind(Body())
  async create(createCatDto) {
	logger.error(`>>> Entering create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
    this.catsService.create(createCatDto);
	logger.warn(`<<< Exiting create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
  }

  @Get()
  async findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.catsService.findAll();
  }

  @Get(':id')
  @Bind(Param('id'))
  findOne(id) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    // logic
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
  }
}
