const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateDogDto } from './dto/create-dog.dto.js';
import { UpdateDogDto } from './dto/update-dog.dto.js';

@Injectable()
export class DogsService {
  create(createDogDto: CreateDogDto) {
	logger.debug(`>>> Entering create(createDogDto=${createDogDto})`);
	logger.debug(`<<< Exiting create(createDogDto=${createDogDto})`);
    return 'This action adds a new dog';
  }

  findAll() {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return `This action returns all dogs`;
  }

  findOne(id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return `This action returns a #${id} dog`;
  }

  update(id: number, updateDogDto: UpdateDogDto) {
	logger.debug(`>>> Entering update(id=${id},updateDogDto=${updateDogDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateDogDto=${updateDogDto})`);
    return `This action updates a #${id} dog`;
  }

  remove(id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return `This action removes a #${id} dog`;
  }
}
