const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { TransientLoggerService } from './transient-logger.service.js';

@Injectable({ scope: Scope.REQUEST })
export class SecondRequestService {
  static COUNTER = 0;

  constructor(public readonly logger: TransientLoggerService) {
	logger.debug(`>>> Entering constructor(TransientLoggerService=${TransientLoggerService})`);
    SecondRequestService.COUNTER++;
    this.logger.setContext('SecondService');
	logger.debug(`<<< Exiting constructor(TransientLoggerService=${TransientLoggerService})`);
  }
}
