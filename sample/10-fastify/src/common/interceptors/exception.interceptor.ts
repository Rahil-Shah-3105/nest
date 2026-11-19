const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
	logger.error(`>>> Entering intercept(context=${context},next=${next})`, { "event.action": "intercept" });
	logger.warn(`<<< Exiting intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    return next
      .handle()
      .pipe(
        catchError(err =>
          throwError(
            () =>
              new HttpException(
                'Exception interceptor message',
                HttpStatus.BAD_GATEWAY,
              ),
          ),
        ),
      );
  }
}
