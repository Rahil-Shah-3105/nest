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
	logger.debug('>>> Entering constructor()');
    UserByIdPipe.COUNTER++;
	logger.debug('<<< Exiting constructor()');
  }

  transform(value: string, metadata: ArgumentMetadata) {
	logger.debug(`>>> Entering transform(value=${value},metadata=${metadata})`);
	logger.debug(`<<< Exiting transform(value=${value},metadata=${metadata})`);
    return value;
  }
}
