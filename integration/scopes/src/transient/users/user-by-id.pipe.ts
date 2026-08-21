const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, PipeTransform, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor() {
	logger.debug('>>> Entering constructor()');
    UserByIdPipe.COUNTER++;
	logger.debug('<<< Exiting constructor()');
  }

  transform(value: string) {
	logger.debug(`>>> Entering transform(value=${value})`);
	logger.debug(`<<< Exiting transform(value=${value})`);
    return value;
  }
}
