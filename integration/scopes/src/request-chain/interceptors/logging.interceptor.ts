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
	logger.error(`>>> Entering intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    this.helperSvc.noop();
    if (!this.helperSvc.request) {
      throw new Error('error');
    }
	logger.warn(`<<< Exiting intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    return next.handle();
  }
}
