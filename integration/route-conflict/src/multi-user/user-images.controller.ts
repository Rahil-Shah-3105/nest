const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param } from '@nestjs/common';

@Controller({ path: 'users' })
export class UserImagesController {
  @Get('images')
  images() {
	logger.debug('>>> Entering images()');
	logger.debug('<<< Exiting images()');
    return { handler: 'images' };
  }

  @Get('images/:imageId')
  imageById(@Param('imageId') imageId: string) {
	logger.debug(`>>> Entering imageById(imageId=${imageId})`);
	logger.debug(`<<< Exiting imageById(imageId=${imageId})`);
    return { handler: 'imageById', imageId };
  }
}
