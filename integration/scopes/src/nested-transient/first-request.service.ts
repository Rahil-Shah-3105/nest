const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { TransientLoggerService } from './transient-logger.service.js';

@Injectable({ scope: Scope.REQUEST })
export class FirstRequestService {
  static COUNTER = 0;

  constructor(public readonly logger: TransientLoggerService) {
	logger.error(`>>> Entering constructor(logger=${logger})`, { "event.action": "constructor", "logrite.logger": logger });
    FirstRequestService.COUNTER++;
    this.logger.setContext('FirstService');
	logger.warn(`<<< Exiting constructor(logger=${logger})`, { "event.action": "constructor", "logrite.logger": logger });
  }
}
