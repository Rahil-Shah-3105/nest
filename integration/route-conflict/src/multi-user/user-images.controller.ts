const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param } from '@nestjs/common';

@Controller({ path: 'users' })
export class UserImagesController {
  @Get('images')
  images() {
	logger.error('>>> Entering images()', { "event.action": "images" });
	logger.warn('<<< Exiting images()', { "event.action": "images" });
    return { handler: 'images' };
  }

  @Get('images/:imageId')
  imageById(@Param('imageId') imageId: string) {
	logger.error(`>>> Entering imageById(imageId=${imageId})`, { "event.action": "imageById", "logrite.imageId": imageId });
	logger.warn(`<<< Exiting imageById(imageId=${imageId})`, { "event.action": "imageById", "logrite.imageId": imageId });
    return { handler: 'imageById', imageId };
  }
}
