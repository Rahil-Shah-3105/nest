const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { EagerService } from './eager.module.js';

@Injectable({ scope: Scope.REQUEST })
export class RequestService {
  constructor(private eagerService: EagerService) {}

  eager() {
	logger.debug('>>> Entering eager()');
	logger.debug('<<< Exiting eager()');
    return this.eagerService.sayHello();
  }
}
