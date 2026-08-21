const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { UpdateCatDto } from './dto/update-cat.dto.js';
import { Cat } from './schemas/cat.schema.js';

@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private readonly catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
    const createdCat = await this.catModel.create(createCatDto);
	logger.debug(`create(createCatDto=${createCatDto}): createdCat → ${createdCat}`);
    return createdCat;
  }

  async findAll(): Promise<Cat[]> {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.catModel.find().exec();
  }

  async findOne(id: string): Promise<Cat | null> {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.catModel.findOne({ _id: id }).exec();
  }

  async update(id: string, updateCatDto: UpdateCatDto): Promise<Cat | null> {
	logger.debug(`>>> Entering update(id=${id},updateCatDto=${updateCatDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateCatDto=${updateCatDto})`);
    return this.catModel
      .findByIdAndUpdate({ _id: id }, updateCatDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Cat | null> {
	logger.debug(`>>> Entering delete(id=${id})`);
    const deletedCat = await this.catModel
      .findByIdAndDelete({ _id: id })
      .exec();
	logger.debug(`<<< Exiting delete(id=${id})`);
    return deletedCat;
  }
}
