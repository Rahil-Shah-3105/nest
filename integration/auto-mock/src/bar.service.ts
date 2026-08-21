const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { FooService } from './foo.service.js';

@Injectable()
export class BarService {
  constructor(private readonly foo: FooService) {}

  bar() {
	logger.debug('>>> Entering bar()');
    this.foo.foo();
	logger.debug('<<< Exiting bar()');
  }
}
