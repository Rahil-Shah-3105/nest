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
	logger.debug('>>> Entering constructor()');
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test2',
        wildcards: true,
      },
    });
	logger.debug('<<< Exiting constructor()');
  }

  @Get('topic-exchange')
  async topicExchange() {
	logger.debug('>>> Entering topicExchange()');
	logger.debug('<<< Exiting topicExchange()');
    return lastValueFrom(this.client.send<string>('wildcard.a.b', 1));
  }

  @MessagePattern('wildcard.*.*')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
	logger.debug(`>>> Entering handleTopicExchange(ctx=${ctx})`);
	logger.debug(`<<< Exiting handleTopicExchange(ctx=${ctx})`);
    return ctx.getPattern();
  }
}
