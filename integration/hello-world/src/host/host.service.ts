const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';

@Injectable()
export class HostService {
  greeting(): string {
	logger.debug('>>> Entering greeting()');
	logger.debug('<<< Exiting greeting()');
    return 'Host Greeting!';
  }
}
