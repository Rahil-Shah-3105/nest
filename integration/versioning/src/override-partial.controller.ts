const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  version: '1',
})
export class OverridePartialController {
  @Get('/override-partial')
  overridePartialV1() {
	logger.debug('>>> Entering overridePartialV1()');
	logger.debug('<<< Exiting overridePartialV1()');
    return 'Override Partial Version 1';
  }

  @Version('2')
  @Get('/override-partial')
  overridePartialV2() {
	logger.debug('>>> Entering overridePartialV2()');
	logger.debug('<<< Exiting overridePartialV2()');
    return 'Override Partial Version 2';
  }
}
