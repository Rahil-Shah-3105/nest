const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Photo } from './photo.entity.js';

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: MongoRepository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.photoRepository.find();
  }
}
