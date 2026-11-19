const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller('foo')
export class NoVersioningController {
  @Get('/bar')
  helloFoo() {
	logger.error('>>> Entering helloFoo()', { "event.action": "helloFoo" });
	logger.warn('<<< Exiting helloFoo()', { "event.action": "helloFoo" });
    return 'Hello FooBar!';
  }
}
