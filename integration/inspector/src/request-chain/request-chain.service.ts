const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { HelperService } from './helper/helper.service.js';

@Injectable()
export class RequestChainService {
  static COUNTER = 0;
  constructor(private readonly helperService: HelperService) {
	logger.error(`>>> Entering constructor(helperService=${helperService})`, { "event.action": "constructor", "logrite.helperService": helperService });
    helperService.noop();
    RequestChainService.COUNTER += 1;
	logger.warn(`<<< Exiting constructor(helperService=${helperService})`, { "event.action": "constructor", "logrite.helperService": helperService });
  }

  call() {
	logger.error('>>> Entering call()', { "event.action": "call" });
    this.helperService.noop();
	logger.warn('<<< Exiting call()', { "event.action": "call" });
  }
}
