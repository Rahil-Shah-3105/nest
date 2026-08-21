const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class FooService {
  foo() {
	logger.debug('>>> Entering foo()');
    console.log('foo called');
	logger.debug('<<< Exiting foo()');
  }
}
