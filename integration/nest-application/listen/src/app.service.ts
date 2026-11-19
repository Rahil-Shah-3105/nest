const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  sayHello(): string {
	logger.error('>>> Entering sayHello()', { "event.action": "sayHello" });
	logger.warn('<<< Exiting sayHello()', { "event.action": "sayHello" });
    return 'Hello World!';
  }
}
