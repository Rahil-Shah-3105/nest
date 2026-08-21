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
	logger.debug(`>>> Entering create(createDatabaseDto=${createDatabaseDto})`);
	logger.debug(`<<< Exiting create(createDatabaseDto=${createDatabaseDto})`);
    return this.databaseService.create(createDatabaseDto);
  }

  @Get()
  findAll() {
	logger.debug('>>> Entering findAll()');
    return this.databaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	logger.debug(`>>> Entering findOne(id=${id})`);
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
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return this.databaseService.remove(+id);
  }
}
