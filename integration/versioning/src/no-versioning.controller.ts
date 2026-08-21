const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller('foo')
export class NoVersioningController {
  @Get('/bar')
  helloFoo() {
	logger.debug('>>> Entering helloFoo()');
	logger.debug('<<< Exiting helloFoo()');
    return 'Hello FooBar!';
  }
}
