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
	logger.error(`>>> Entering create(createDogDto=${createDogDto})`, { "event.action": "create", "logrite.createDogDto": createDogDto });
	logger.warn(`<<< Exiting create(createDogDto=${createDogDto})`, { "event.action": "create", "logrite.createDogDto": createDogDto });
    return this.dogsService.create(createDogDto);
  }

  @Get()
  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.dogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.dogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDogDto: UpdateDogDto) {
	logger.error(`>>> Entering update(id=${id},updateDogDto=${updateDogDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateDogDto": updateDogDto });
	logger.warn(`<<< Exiting update(id=${id},updateDogDto=${updateDogDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateDogDto": updateDogDto });
    return this.dogsService.update(+id, updateDogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return this.dogsService.remove(+id);
  }
}
