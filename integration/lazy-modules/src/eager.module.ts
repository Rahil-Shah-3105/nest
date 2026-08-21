const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module, Injectable } from '@nestjs/common';
import { GlobalService } from './global.module.js';

@Injectable()
export class EagerService {
  private counter = 0;
  constructor(public globalService: GlobalService) {}

  sayHello() {
	logger.debug('>>> Entering sayHello()');
    this.counter++;
	logger.debug('<<< Exiting sayHello()');
    return 'Hi! Counter is ' + this.counter;
  }
}

@Module({
  providers: [EagerService],
})
export class EagerModule {}
