const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Post } from '@nestjs/common';
import { Photo } from './photo.entity.js';
import { PhotoService } from './photo.service.js';

@Controller('photo')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Get()
  findAll(): Promise<Photo[]> {
	logger.debug('>>> Entering findAll()');
    return this.photoService.findAll();
  }

  @Post()
  create(): Promise<Photo> {
	logger.debug('>>> Entering create()');
	logger.debug('<<< Exiting create()');
    return this.photoService.create();
  }
}
