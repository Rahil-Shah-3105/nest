const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  version: VERSION_NEUTRAL,
})
export class VersionNeutralController {
  @Get('/neutral')
  neutral() {
	logger.debug('>>> Entering neutral()');
	logger.debug('<<< Exiting neutral()');
    return 'Neutral';
  }
}
