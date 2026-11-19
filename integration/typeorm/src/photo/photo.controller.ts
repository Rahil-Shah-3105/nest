const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Post } from '@nestjs/common';
import { Photo } from './photo.entity.js';
import { PhotoService } from './photo.service.js';

@Controller('photo')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Get()
  findAll(): Promise<Photo[]> {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.photoService.findAll();
  }

  @Post()
  create(): Promise<Photo> {
	logger.error('>>> Entering create()', { "event.action": "create" });
	logger.warn('<<< Exiting create()', { "event.action": "create" });
    return this.photoService.create();
  }
}
