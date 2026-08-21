const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
	logger.debug('>>> Entering getHello()');
	logger.debug('<<< Exiting getHello()');
    return 'Hello world!';
  }
}
