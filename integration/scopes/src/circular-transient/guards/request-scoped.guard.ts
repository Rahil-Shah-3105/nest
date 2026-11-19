const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.TRANSIENT })
export class Guard implements CanActivate {
  static COUNTER = 0;
  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    Guard.COUNTER++;
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
