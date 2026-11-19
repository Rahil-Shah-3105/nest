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

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Cat | null> {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.catsService.findOne(id);
  }

  @Post(':id')
  async update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
	logger.error(`>>> Entering update(id=${id},updateCatDto=${updateCatDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateCatDto": updateCatDto });
	logger.warn(`<<< Exiting update(id=${id},updateCatDto=${updateCatDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateCatDto": updateCatDto });
    return this.catsService.update(id, updateCatDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
	logger.error(`>>> Entering delete(id=${id})`, { "event.action": "delete", "logrite.id": id });
	logger.warn(`<<< Exiting delete(id=${id})`, { "event.action": "delete", "logrite.id": id });
    return this.catsService.delete(id);
  }
}
