const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RequestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
	logger.error(`>>> Entering intercept(context=${context},next=${next})`, { "event.action": "intercept" });
    const client = context.switchToWs().getClient();
    const pattern = context.switchToWs().getPattern();
	logger.error(`intercept(context=${context},next=${next}): client → ${client}`, { "event.action": "intercept" });
	logger.error(`intercept(context=${context},next=${next}): pattern → ${pattern}`, { "event.action": "intercept" });
    client.pattern = pattern;
	logger.debug(`intercept(context=${context},next=${next}): client.pattern → ${client.pattern}`, { "event.action": "intercept" });
    return next.handle();
  }
}
