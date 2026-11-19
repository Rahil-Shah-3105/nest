const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, RmqContext } from '@nestjs/microservices';

@Controller()
export class RMQFanoutExchangeConsumerController {
  constructor() {}

  @MessagePattern('ping')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
	logger.error(`>>> Entering handleTopicExchange(ctx=${ctx})`, { "event.action": "handleTopicExchange" });
	logger.warn(`<<< Exiting handleTopicExchange(ctx=${ctx})`, { "event.action": "handleTopicExchange" });
    return ctx.getPattern() + '/pong';
  }
}
