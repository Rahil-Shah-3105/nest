const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  path: 'middleware',
  version: VERSION_NEUTRAL,
})
export class VersionNeutralMiddlewareController {
  @Get('/neutral')
  neutral() {
	logger.debug('>>> Entering neutral()');
	logger.debug('<<< Exiting neutral()');
    return 'Neutral';
  }
}
