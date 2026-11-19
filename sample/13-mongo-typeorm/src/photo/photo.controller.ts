const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { PhotoService } from './photo.service.js';
import { Photo } from './photo.entity.js';

@Controller('photo')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Get()
  findAll(): Promise<Photo[]> {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.photoService.findAll();
  }
}
