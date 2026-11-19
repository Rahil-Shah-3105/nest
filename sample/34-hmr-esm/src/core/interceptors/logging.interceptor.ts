const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
	logger.error(`>>> Entering intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    console.log('Before...');

    const now = Date.now();
	logger.warn(`<<< Exiting intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    return next
      .handle()
      .pipe(tap(() => console.log(`After... ${Date.now() - now}ms`)));
  }
}
