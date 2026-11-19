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
	const startTime: number = Date.now();
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
    return this.photoRepository.find();
  }

  async create(): Promise<Photo> {
	logger.error('>>> Entering create()', { "event.action": "create" });
    const photoEntity = new Photo();
	logger.debug(`create(): photoEntity.description → ${photoEntity.description}`, { "event.action": "create" });
	logger.debug(`create(): photoEntity.views → ${photoEntity.views}`, { "event.action": "create" });
    photoEntity.name = 'Nest';
    photoEntity.description = 'Is great!';
	logger.error(`create(): photoEntity → ${photoEntity}`, { "event.action": "create" });
	logger.debug(`create(): photoEntity.name → ${photoEntity.name}`, { "event.action": "create" });
    photoEntity.views = 6000;

	logger.warn('<<< Exiting create()', { "event.action": "create" });
    return this.photoRepository.create(photoEntity);
  }
}
