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
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
	logger.debug(`>>> Entering intercept(context=${context},next=${next})`);
	logger.debug(`<<< Exiting intercept(context=${context},next=${next})`);
    return next
      .handle()
      .pipe(
        catchError(err =>
          throwError(
            () => new HttpException('New message', HttpStatus.BAD_GATEWAY),
          ),
        ),
      );
  }
}
