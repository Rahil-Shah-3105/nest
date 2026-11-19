const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.REQUEST })
export class Interceptor implements NestInterceptor {
  static COUNTER = 0;
  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    Interceptor.COUNTER++;
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }
  intercept(context: ExecutionContext, call: CallHandler): Observable<any> {
	logger.error(`>>> Entering intercept(context=${context},call=${call})`, { "event.action": "intercept", "logrite.call": call });
	logger.warn(`<<< Exiting intercept(context=${context},call=${call})`, { "event.action": "intercept", "logrite.call": call });
    return call.handle();
  }
}
