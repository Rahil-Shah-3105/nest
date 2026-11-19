const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  MessagePattern,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Controller()
export class RMQTopicExchangeController {
  client: ClientProxy;

  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test2',
        wildcards: true,
      },
    });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  @Get('topic-exchange')
  async topicExchange() {
	logger.error('>>> Entering topicExchange()', { "event.action": "topicExchange" });
	logger.warn('<<< Exiting topicExchange()', { "event.action": "topicExchange" });
    return lastValueFrom(this.client.send<string>('wildcard.a.b', 1));
  }

  @MessagePattern('wildcard.*.*')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
	logger.error(`>>> Entering handleTopicExchange(ctx=${ctx})`, { "event.action": "handleTopicExchange" });
	logger.warn(`<<< Exiting handleTopicExchange(ctx=${ctx})`, { "event.action": "handleTopicExchange" });
    return ctx.getPattern();
  }
}
