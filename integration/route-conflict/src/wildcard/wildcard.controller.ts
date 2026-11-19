const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param } from '@nestjs/common';

@Controller('files')
export class WildcardController {
  @Get('*path')
  catchAll() {
	logger.error('>>> Entering catchAll()', { "event.action": "catchAll" });
	logger.warn('<<< Exiting catchAll()', { "event.action": "catchAll" });
    return { handler: 'catchAll' };
  }

  @Get(':fileId')
  byId(@Param('fileId') fileId: string) {
	logger.error(`>>> Entering byId(fileId=${fileId})`, { "event.action": "byId", "logrite.fileId": fileId });
	logger.warn(`<<< Exiting byId(fileId=${fileId})`, { "event.action": "byId", "logrite.fileId": fileId });
    return { handler: 'byId', fileId };
  }

  @Get('readme')
  readme() {
	logger.error('>>> Entering readme()', { "event.action": "readme" });
	logger.warn('<<< Exiting readme()', { "event.action": "readme" });
    return { handler: 'readme' };
  }
}
