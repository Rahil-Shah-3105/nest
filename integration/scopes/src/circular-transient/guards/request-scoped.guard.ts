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
	logger.debug('>>> Entering constructor()');
    Guard.COUNTER++;
	logger.debug('<<< Exiting constructor()');
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
