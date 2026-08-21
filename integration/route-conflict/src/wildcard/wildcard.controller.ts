const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param } from '@nestjs/common';

@Controller('files')
export class WildcardController {
  @Get('*path')
  catchAll() {
	logger.debug('>>> Entering catchAll()');
	logger.debug('<<< Exiting catchAll()');
    return { handler: 'catchAll' };
  }

  @Get(':fileId')
  byId(@Param('fileId') fileId: string) {
	logger.debug(`>>> Entering byId(fileId=${fileId})`);
	logger.debug(`<<< Exiting byId(fileId=${fileId})`);
    return { handler: 'byId', fileId };
  }

  @Get('readme')
  readme() {
	logger.debug('>>> Entering readme()');
	logger.debug('<<< Exiting readme()');
    return { handler: 'readme' };
  }
}
