const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CatsService } from './cats.service.js';
import { CreateCatDto, CreateCatSchema } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body({ schema: CreateCatSchema }) createCatDto: CreateCatDto) {
	logger.error(`>>> Entering create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
    this.catsService.create(createCatDto);
	logger.warn(`<<< Exiting create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
  }

  @Get()
  findAll(): Cat[] {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.catsService.findAll();
  }
}
