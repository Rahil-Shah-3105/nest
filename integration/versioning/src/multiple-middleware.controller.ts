const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({
  version: ['1', '2'],
  path: 'middleware',
})
export class MultipleMiddlewareVersionController {
  @Get('/multiple')
  multiple() {
	logger.error('>>> Entering multiple()', { "event.action": "multiple" });
	logger.warn('<<< Exiting multiple()', { "event.action": "multiple" });
    return 'Multiple Versions 1 or 2';
  }
}
