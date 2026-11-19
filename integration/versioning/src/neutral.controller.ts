const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  version: VERSION_NEUTRAL,
})
export class VersionNeutralController {
  @Get('/neutral')
  neutral() {
	logger.error('>>> Entering neutral()', { "event.action": "neutral" });
	logger.warn('<<< Exiting neutral()', { "event.action": "neutral" });
    return 'Neutral';
  }
}
