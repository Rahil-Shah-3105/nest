const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { CatsService } from './cats.service.js';
import { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
	logger.debug(`<<< Exiting create(createCatDto=${createCatDto})`);
    return this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.catsService.findAll();
  }
}
