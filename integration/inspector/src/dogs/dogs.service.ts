const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateDogDto } from './dto/create-dog.dto.js';
import { UpdateDogDto } from './dto/update-dog.dto.js';

@Injectable()
export class DogsService {
  create(createDogDto: CreateDogDto) {
	logger.error(`>>> Entering create(createDogDto=${createDogDto})`, { "event.action": "create", "logrite.createDogDto": createDogDto });
	logger.warn(`<<< Exiting create(createDogDto=${createDogDto})`, { "event.action": "create", "logrite.createDogDto": createDogDto });
    return 'This action adds a new dog';
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return `This action returns all dogs`;
  }

  findOne(id: number) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return `This action returns a #${id} dog`;
  }

  update(id: number, updateDogDto: UpdateDogDto) {
	logger.error(`>>> Entering update(id=${id},updateDogDto=${updateDogDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateDogDto": updateDogDto });
	logger.warn(`<<< Exiting update(id=${id},updateDogDto=${updateDogDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateDogDto": updateDogDto });
    return `This action updates a #${id} dog`;
  }

  remove(id: number) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return `This action removes a #${id} dog`;
  }
}
