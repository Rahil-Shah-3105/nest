const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.REQUEST })
export class Interceptor implements NestInterceptor {
  static COUNTER = 0;
  static REQUEST_SCOPED_DATA = [] as number[];

  constructor(@Inject('REQUEST_ID') private readonly requestId: number) {
	logger.debug(`>>> Entering constructor(requestId=${requestId})`);
    Interceptor.COUNTER++;
	logger.debug(`<<< Exiting constructor(requestId=${requestId})`);
  }

  intercept(context: ExecutionContext, call: CallHandler): Observable<any> {
	logger.debug(`>>> Entering intercept(context=${context},call=${call})`);
    Interceptor.REQUEST_SCOPED_DATA.push(this.requestId);
	logger.debug(`<<< Exiting intercept(context=${context},call=${call})`);
    return call.handle();
  }
}
