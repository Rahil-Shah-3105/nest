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
	logger.debug('>>> Entering constructor()');
    Interceptor.COUNTER++;
	logger.debug('<<< Exiting constructor()');
  }
  intercept(context: ExecutionContext, call: CallHandler): Observable<any> {
	logger.debug(`>>> Entering intercept(context=${context},call=${call})`);
	logger.debug(`<<< Exiting intercept(context=${context},call=${call})`);
    return call.handle();
  }
}
