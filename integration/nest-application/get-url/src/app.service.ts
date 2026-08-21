const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  sayHello(): string {
	logger.debug('>>> Entering sayHello()');
	logger.debug('<<< Exiting sayHello()');
    return 'Hello World!';
  }
}
