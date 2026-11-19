const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Controller()
export class RMQFanoutExchangeProducerController {
  client: ClientProxy;

  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        exchange: 'test.fanout',
        exchangeType: 'fanout',
      },
    });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  @Get('fanout-exchange')
  async topicExchange() {
	logger.error('>>> Entering topicExchange()', { "event.action": "topicExchange" });
	logger.warn('<<< Exiting topicExchange()', { "event.action": "topicExchange" });
    return lastValueFrom(this.client.send<string>('ping', 1));
  }
}
