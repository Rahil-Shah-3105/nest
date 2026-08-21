const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
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
  @Roles(['admin'])
  async create(@Body() createCatDto: CreateCatDto) {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
    this.catsService.create(createCatDto);
	logger.debug(`<<< Exiting create(createCatDto=${createCatDto})`);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
	logger.debug('>>> Entering findAll()');
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseIntPipe())
    id: number,
  ) {
    // Retrieve a Cat instance by ID
    console.log(id);
  }
}
