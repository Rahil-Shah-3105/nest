const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { EagerService } from './eager.module.js';

@Injectable({ scope: Scope.REQUEST })
export class RequestService {
  constructor(private eagerService: EagerService) {}

  eager() {
	logger.error('>>> Entering eager()', { "event.action": "eager" });
	logger.warn('<<< Exiting eager()', { "event.action": "eager" });
    return this.eagerService.sayHello();
  }
}
