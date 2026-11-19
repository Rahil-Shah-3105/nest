const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ParseIntPipe } from '../common/pipes/parse-int.pipe.js';
import { CatsService } from './cats.service.js';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@UseGuards(RolesGuard)
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
	logger.error(`>>> Entering create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
    this.catsService.create(createCatDto);
	logger.warn(`<<< Exiting create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
  }

  @Get()
  async findAll(): Promise<Cat[]> {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseIntPipe())
    id: number,
  ) {
    // get by ID logic
  }
}
