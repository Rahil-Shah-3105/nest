const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  path: 'middleware',
  version: VERSION_NEUTRAL,
})
export class VersionNeutralMiddlewareController {
  @Get('/neutral')
  neutral() {
	logger.error('>>> Entering neutral()', { "event.action": "neutral" });
	logger.warn('<<< Exiting neutral()', { "event.action": "neutral" });
    return 'Neutral';
  }
}
