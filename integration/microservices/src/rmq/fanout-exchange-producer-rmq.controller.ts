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
	logger.debug('>>> Entering constructor()');
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        exchange: 'test.fanout',
        exchangeType: 'fanout',
      },
    });
	logger.debug('<<< Exiting constructor()');
  }

  @Get('fanout-exchange')
  async topicExchange() {
	logger.debug('>>> Entering topicExchange()');
	logger.debug('<<< Exiting topicExchange()');
    return lastValueFrom(this.client.send<string>('ping', 1));
  }
}
