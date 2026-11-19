const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, PipeTransform, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    UserByIdPipe.COUNTER++;
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  transform(value: string) {
	logger.error(`>>> Entering transform(value=${value})`, { "event.action": "transform", "logrite.value": value });
	logger.warn(`<<< Exiting transform(value=${value})`, { "event.action": "transform", "logrite.value": value });
    return value;
  }
}
