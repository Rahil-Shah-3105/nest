const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

@Controller()
export class OverrideController {
  @Version('1')
  @Get('/override')
  overrideV1() {
	logger.error('>>> Entering overrideV1()', { "event.action": "overrideV1" });
	logger.warn('<<< Exiting overrideV1()', { "event.action": "overrideV1" });
    return 'Override Version 1';
  }

  @Version('2')
  @Get('/override')
  overrideV2() {
	logger.error('>>> Entering overrideV2()', { "event.action": "overrideV2" });
	logger.warn('<<< Exiting overrideV2()', { "event.action": "overrideV2" });
    return 'Override Version 2';
  }
}
