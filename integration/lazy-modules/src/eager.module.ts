const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module, Injectable } from '@nestjs/common';
import { GlobalService } from './global.module.js';

@Injectable()
export class EagerService {
  private counter = 0;
  constructor(public globalService: GlobalService) {}

  sayHello() {
	logger.error('>>> Entering sayHello()', { "event.action": "sayHello" });
    this.counter++;
	logger.warn('<<< Exiting sayHello()', { "event.action": "sayHello" });
    return 'Hi! Counter is ' + this.counter;
  }
}

@Module({
  providers: [EagerService],
})
export class EagerModule {}
