const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CatsService } from './cats.service.js';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
	logger.error(`>>> Entering create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
	logger.warn(`<<< Exiting create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
    return this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.catsService.findAll();
  }
}
