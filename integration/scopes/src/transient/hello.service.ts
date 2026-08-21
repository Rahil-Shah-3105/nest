const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class HelloService {
  constructor(@Inject('META') private readonly meta) {}

  greeting(): string {
	logger.debug('>>> Entering greeting()');
	logger.debug('<<< Exiting greeting()');
    return 'Hello world!';
  }
}
