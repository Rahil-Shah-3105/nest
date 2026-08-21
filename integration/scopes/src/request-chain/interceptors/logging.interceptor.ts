const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HelperService } from '../helper/helper.service.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly helperSvc: HelperService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.helperSvc.noop();
    if (!this.helperSvc.request) {
	logger.debug(`>>> Entering intercept(context=${context},next=${next})`);
	logger.debug(`<<< Exiting intercept(context=${context},next=${next})`);
      throw new Error('error');
    }
    return next.handle();
  }
}
