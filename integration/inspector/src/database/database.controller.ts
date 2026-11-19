const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { CreateDatabaseDto } from './dto/create-database.dto.js';
import { UpdateDatabaseDto } from './dto/update-database.dto.js';

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post()
  create(@Body() createDatabaseDto: CreateDatabaseDto) {
	logger.error(`>>> Entering create(createDatabaseDto=${createDatabaseDto})`, { "event.action": "create", "logrite.createDatabaseDto": createDatabaseDto });
	logger.warn(`<<< Exiting create(createDatabaseDto=${createDatabaseDto})`, { "event.action": "create", "logrite.createDatabaseDto": createDatabaseDto });
    return this.databaseService.create(createDatabaseDto);
  }

  @Get()
  findAll() {
	const startTime: number = Date.now();
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
    return this.databaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.databaseService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDatabaseDto: UpdateDatabaseDto,
  ) {
    return this.databaseService.update(+id, updateDatabaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return this.databaseService.remove(+id);
  }
}
