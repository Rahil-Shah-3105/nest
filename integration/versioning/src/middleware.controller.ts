const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  path: 'middleware',
  version: '1',
})
export class MiddlewareController {
  @Get('/')
  hello() {
	logger.debug('>>> Entering hello()');
	logger.debug('<<< Exiting hello()');
    return 'Hello from "MiddlewareController"!';
  }

  @Version('2')
  @Get('/override')
  hellov2() {
	logger.debug('>>> Entering hellov2()');
	logger.debug('<<< Exiting hellov2()');
    return 'Hello from "MiddlewareController"!';
  }
}
