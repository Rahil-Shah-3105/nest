const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  constructor(@Inject('CAT_MODEL') private readonly catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
    const createdCat = this.catModel.create(createCatDto);
	logger.debug(`create(createCatDto=${createCatDto}): createdCat → ${createdCat}`);
    return createdCat;
  }

  async findAll(): Promise<Cat[]> {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.catModel.find().exec();
  }
}
