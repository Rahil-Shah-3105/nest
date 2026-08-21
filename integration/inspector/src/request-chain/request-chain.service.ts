const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { HelperService } from './helper/helper.service.js';

@Injectable()
export class RequestChainService {
  static COUNTER = 0;
  constructor(private readonly helperService: HelperService) {
	logger.debug(`>>> Entering constructor(HelperService=${HelperService})`);
    helperService.noop();
    RequestChainService.COUNTER += 1;
	logger.debug(`<<< Exiting constructor(HelperService=${HelperService})`);
  }

  call() {
	logger.debug('>>> Entering call()');
    this.helperService.noop();
	logger.debug('<<< Exiting call()');
  }
}
