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
	logger.debug('>>> Entering greeting()');
    this.logger.log('Hello request!');
	logger.debug('<<< Exiting greeting()');
  }

  farewell() {
	logger.debug('>>> Entering farewell()');
    this.logger.log('Goodbye request!');
	logger.debug('<<< Exiting farewell()');
  }
}
