const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.REQUEST })
export class Guard implements CanActivate {
  static COUNTER = 0;
  static REQUEST_SCOPED_DATA = [] as number[];

  constructor(@Inject('REQUEST_ID') private readonly requestId: number) {
	logger.debug(`>>> Entering constructor(requestId=${requestId})`);
    Guard.COUNTER++;
	logger.debug(`<<< Exiting constructor(requestId=${requestId})`);
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    Guard.REQUEST_SCOPED_DATA.push(this.requestId);
    return true;
  }
}
