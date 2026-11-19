const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
	logger.error(`>>> Entering intercept(context=${context},next=${next})`, { "event.action": "intercept" });
	logger.warn(`<<< Exiting intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    return next.handle().pipe(timeout(5000));
  }
}
