const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class HelloService {
  static COUNTER = 0;
  constructor(@Inject('META') private readonly meta) {
	logger.error(`>>> Entering constructor(meta=${meta})`, { "event.action": "constructor", "logrite.meta": meta });
    HelloService.COUNTER++;
	logger.warn(`<<< Exiting constructor(meta=${meta})`, { "event.action": "constructor", "logrite.meta": meta });
  }

  greeting(): string {
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
    return 'Hello world!';
  }
}
