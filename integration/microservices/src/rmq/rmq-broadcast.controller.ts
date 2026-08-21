const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { scan, take } from 'rxjs/operators';

@Controller()
export class RMQBroadcastController {
  client: ClientProxy;

  constructor() {
	logger.debug('>>> Entering constructor()');
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test_broadcast',
        queueOptions: { durable: true },
        socketOptions: { noDelay: true },
      },
    });
	logger.debug('<<< Exiting constructor()');
  }

  @Get('broadcast')
  multicats() {
	logger.debug('>>> Entering multicats()');
	logger.debug('<<< Exiting multicats()');
    return this.client.send<number>({ cmd: 'broadcast' }, {}).pipe(
      scan((a, b) => a + b),
      take(2),
    );
  }

  @MessagePattern({ cmd: 'broadcast' })
  replyBroadcast(): Observable<number> {
	logger.debug('>>> Entering replyBroadcast()');
	logger.debug('<<< Exiting replyBroadcast()');
    return new Observable(observer => observer.next(1));
  }
}
