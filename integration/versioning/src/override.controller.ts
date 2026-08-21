const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

@Controller()
export class OverrideController {
  @Version('1')
  @Get('/override')
  overrideV1() {
	logger.debug('>>> Entering overrideV1()');
	logger.debug('<<< Exiting overrideV1()');
    return 'Override Version 1';
  }

  @Version('2')
  @Get('/override')
  overrideV2() {
	logger.debug('>>> Entering overrideV2()');
	logger.debug('<<< Exiting overrideV2()');
    return 'Override Version 2';
  }
}
