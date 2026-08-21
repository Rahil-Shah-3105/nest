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
	logger.debug(`>>> Entering intercept(context=${context},next=${next})`);
	logger.debug(`<<< Exiting intercept(context=${context},next=${next})`);
    return next.handle().pipe(timeout(5000));
  }
}
