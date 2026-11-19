const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  path: 'middleware',
  version: '1',
})
export class MiddlewareController {
  @Get('/')
  hello() {
	logger.error('>>> Entering hello()', { "event.action": "hello" });
	logger.warn('<<< Exiting hello()', { "event.action": "hello" });
    return 'Hello from "MiddlewareController"!';
  }

  @Version('2')
  @Get('/override')
  hellov2() {
	logger.error('>>> Entering hellov2()', { "event.action": "hellov2" });
	logger.warn('<<< Exiting hellov2()', { "event.action": "hellov2" });
    return 'Hello from "MiddlewareController"!';
  }
}
