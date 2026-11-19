const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  version: '1',
})
export class OverridePartialController {
  @Get('/override-partial')
  overridePartialV1() {
	logger.error('>>> Entering overridePartialV1()', { "event.action": "overridePartialV1" });
	logger.warn('<<< Exiting overridePartialV1()', { "event.action": "overridePartialV1" });
    return 'Override Partial Version 1';
  }

  @Version('2')
  @Get('/override-partial')
  overridePartialV2() {
	logger.error('>>> Entering overridePartialV2()', { "event.action": "overridePartialV2" });
	logger.warn('<<< Exiting overridePartialV2()', { "event.action": "overridePartialV2" });
    return 'Override Partial Version 2';
  }
}
