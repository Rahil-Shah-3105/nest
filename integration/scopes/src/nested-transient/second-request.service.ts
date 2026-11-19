const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { TransientLoggerService } from './transient-logger.service.js';

@Injectable({ scope: Scope.REQUEST })
export class SecondRequestService {
  static COUNTER = 0;

  constructor(public readonly logger: TransientLoggerService) {
	logger.error(`>>> Entering constructor(logger=${logger})`, { "event.action": "constructor", "logrite.logger": logger });
    SecondRequestService.COUNTER++;
    this.logger.setContext('SecondService');
	logger.warn(`<<< Exiting constructor(logger=${logger})`, { "event.action": "constructor", "logrite.logger": logger });
  }
}
