const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
	logger.error('>>> Entering getHello()', { "event.action": "getHello" });
	logger.warn('<<< Exiting getHello()', { "event.action": "getHello" });
    return 'Hello world!';
  }
}
