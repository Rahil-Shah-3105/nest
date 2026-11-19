const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  Scope,
} from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    UserByIdPipe.COUNTER++;
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  transform(value: string, metadata: ArgumentMetadata) {
	logger.error(`>>> Entering transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
	logger.warn(`<<< Exiting transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    return value;
  }
}
