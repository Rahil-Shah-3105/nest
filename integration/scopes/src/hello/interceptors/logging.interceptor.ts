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
	logger.error(`>>> Entering constructor(requestId=${requestId})`, { "event.action": "constructor", "logrite.requestId": requestId });
    Interceptor.COUNTER++;
	logger.warn(`<<< Exiting constructor(requestId=${requestId})`, { "event.action": "constructor", "logrite.requestId": requestId });
  }

  intercept(context: ExecutionContext, call: CallHandler): Observable<any> {
	logger.error(`>>> Entering intercept(context=${context},call=${call})`, { "event.action": "intercept", "logrite.call": call });
    Interceptor.REQUEST_SCOPED_DATA.push(this.requestId);
	logger.warn(`<<< Exiting intercept(context=${context},call=${call})`, { "event.action": "intercept", "logrite.call": call });
    return call.handle();
  }
}
