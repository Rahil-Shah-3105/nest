const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class HelloService {
  static COUNTER = 0;
  constructor(@Inject('META') private readonly meta) {
	logger.debug(`>>> Entering constructor(meta=${meta})`);
    HelloService.COUNTER++;
	logger.debug(`<<< Exiting constructor(meta=${meta})`);
  }

  greeting(): string {
	logger.debug('>>> Entering greeting()');
	logger.debug('<<< Exiting greeting()');
    return 'Hello world!';
  }
}
