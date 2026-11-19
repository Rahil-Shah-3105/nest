const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class FooService {
  foo() {
	logger.error('>>> Entering foo()', { "event.action": "foo" });
    console.log('foo called');
	logger.warn('<<< Exiting foo()', { "event.action": "foo" });
  }
}
