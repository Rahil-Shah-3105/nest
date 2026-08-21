const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  constructor(@InjectModel('Cat') private readonly catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
    const cat = new this.catModel(createCatDto);
	logger.debug(`create(createCatDto=${createCatDto}): cat → ${cat}`);
    return cat.save();
  }

  async findAll(): Promise<Cat[]> {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.catModel.find().exec();
  }
}
