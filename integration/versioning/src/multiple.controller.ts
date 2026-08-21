const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({
  version: ['1', '2'],
})
export class MultipleVersionController {
  @Get('/multiple')
  multiple() {
	logger.debug('>>> Entering multiple()');
	logger.debug('<<< Exiting multiple()');
    return 'Multiple Versions 1 or 2';
  }
}
