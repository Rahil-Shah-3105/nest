const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class HostArrayService {
  greeting(): string {
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
    return 'Host Greeting!';
  }
}
