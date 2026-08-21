const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, RmqContext } from '@nestjs/microservices';

@Controller()
export class RMQFanoutExchangeConsumerController {
  constructor() {}

  @MessagePattern('ping')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
	logger.debug(`>>> Entering handleTopicExchange(ctx=${ctx})`);
	logger.debug(`<<< Exiting handleTopicExchange(ctx=${ctx})`);
    return ctx.getPattern() + '/pong';
  }
}
