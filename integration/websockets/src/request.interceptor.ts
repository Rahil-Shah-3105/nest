const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RequestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
	logger.debug(`>>> Entering intercept(context=${context},next=${next})`);
    const client = context.switchToWs().getClient();
    const pattern = context.switchToWs().getPattern();
	logger.debug(`intercept(context=${context},next=${next}): client → ${client}`);
    client.pattern = pattern;
	logger.debug(`intercept(context=${context},next=${next}): pattern → ${pattern}`);
    return next.handle();
  }
}
