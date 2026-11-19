const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { EagerService } from './eager.module.js';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  constructor(private eagerService: EagerService) {}

  eager() {
	logger.error('>>> Entering eager()', { "event.action": "eager" });
	logger.warn('<<< Exiting eager()', { "event.action": "eager" });
    return this.eagerService.sayHello();
  }
}
