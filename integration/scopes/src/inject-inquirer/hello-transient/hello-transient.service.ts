const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { TransientLogger } from './transient-logger.service.js';

@Injectable()
export class HelloTransientService {
  static logger = { feature: 'transient' };

  constructor(private readonly logger: TransientLogger) {}

  greeting() {
	logger.debug('>>> Entering greeting()');
    this.logger.log('Hello transient!');
	logger.debug('<<< Exiting greeting()');
  }
}
