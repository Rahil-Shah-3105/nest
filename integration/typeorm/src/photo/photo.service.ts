const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from './photo.entity.js';

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
	logger.debug('>>> Entering findAll()');
    return this.photoRepository.find();
  }

  async create(): Promise<Photo> {
	logger.debug('>>> Entering create()');
    const photoEntity = new Photo();
    photoEntity.name = 'Nest';
    photoEntity.description = 'Is great!';
	logger.debug(`create(): photoEntity → ${photoEntity}`);
	logger.debug(`create(): photoEntity.name → ${photoEntity.name}`);
	logger.debug(`create(): photoEntity.description → ${photoEntity.description}`);
    photoEntity.views = 6000;

    return this.photoRepository.create(photoEntity);
  }
}
