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
import { DogsService } from './dogs.service.js';
import { CreateDogDto } from './dto/create-dog.dto.js';
import { UpdateDogDto } from './dto/update-dog.dto.js';

@Controller('dogs')
export class DogsController {
  constructor(private readonly dogsService: DogsService) {}

  @Post()
  create(@Body() createDogDto: CreateDogDto) {
	logger.debug(`>>> Entering create(createDogDto=${createDogDto})`);
	logger.debug(`<<< Exiting create(createDogDto=${createDogDto})`);
    return this.dogsService.create(createDogDto);
  }

  @Get()
  findAll() {
	logger.debug('>>> Entering findAll()');
    return this.dogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.dogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDogDto: UpdateDogDto) {
	logger.debug(`>>> Entering update(id=${id},updateDogDto=${updateDogDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateDogDto=${updateDogDto})`);
    return this.dogsService.update(+id, updateDogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return this.dogsService.remove(+id);
  }
}
