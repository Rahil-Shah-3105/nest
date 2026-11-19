const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';
import { RequestLogger } from './request-logger.service.js';

@Injectable({ scope: Scope.REQUEST })
export class HelloRequestService {
  static logger = { feature: 'request' };

  constructor(
    private readonly logger: RequestLogger,
    @Inject(INQUIRER) private readonly inquirer,
  ) {}

  greeting() {
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
    this.logger.log('Hello request!');
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
  }

  farewell() {
	logger.error('>>> Entering farewell()', { "event.action": "farewell" });
    this.logger.log('Goodbye request!');
	logger.warn('<<< Exiting farewell()', { "event.action": "farewell" });
  }
}
