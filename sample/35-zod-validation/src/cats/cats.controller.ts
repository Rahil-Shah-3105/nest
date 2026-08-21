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
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
    this.catsService.create(createCatDto);
	logger.debug(`<<< Exiting create(createCatDto=${createCatDto})`);
  }

  @Get()
  findAll(): Cat[] {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.catsService.findAll();
  }
}
