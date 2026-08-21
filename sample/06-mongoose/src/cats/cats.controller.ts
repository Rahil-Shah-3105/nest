const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CatsService } from './cats.service.js';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { UpdateCatDto } from './dto/update-cat.dto.js';
import { Cat } from './schemas/cat.schema.js';

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
    return this.catsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Cat | null> {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.catsService.findOne(id);
  }

  @Post(':id')
  async update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
	logger.debug(`>>> Entering update(id=${id},updateCatDto=${updateCatDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateCatDto=${updateCatDto})`);
    return this.catsService.update(id, updateCatDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
	logger.debug(`>>> Entering delete(id=${id})`);
	logger.debug(`<<< Exiting delete(id=${id})`);
    return this.catsService.delete(id);
  }
}
