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
	logger.error(`>>> Entering create(createCatDto=${createCatDto})`, { "event.action": "create", "logrite.createCatDto": createCatDto });
    const createdCat = await this.catModel.create(createCatDto);
	logger.error(`create(createCatDto=${createCatDto}): createdCat → ${createdCat}`, { "event.action": "create", "logrite.createCatDto": createCatDto });
    return createdCat;
  }

  async findAll(): Promise<Cat[]> {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.catModel.find().exec();
  }

  async findOne(id: string): Promise<Cat | null> {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.catModel.findOne({ _id: id }).exec();
  }

  async update(id: string, updateCatDto: UpdateCatDto): Promise<Cat | null> {
	logger.error(`>>> Entering update(id=${id},updateCatDto=${updateCatDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateCatDto": updateCatDto });
	logger.warn(`<<< Exiting update(id=${id},updateCatDto=${updateCatDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateCatDto": updateCatDto });
    return this.catModel
      .findByIdAndUpdate({ _id: id }, updateCatDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Cat | null> {
	logger.error(`>>> Entering delete(id=${id})`, { "event.action": "delete", "logrite.id": id });
    const deletedCat = await this.catModel
      .findByIdAndDelete({ _id: id })
      .exec();
	logger.warn(`<<< Exiting delete(id=${id})`, { "event.action": "delete", "logrite.id": id });
    return deletedCat;
  }
}
