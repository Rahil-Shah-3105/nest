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
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test_broadcast',
        queueOptions: { durable: true },
        socketOptions: { noDelay: true },
      },
    });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  @Get('broadcast')
  multicats() {
	logger.error('>>> Entering multicats()', { "event.action": "multicats" });
	logger.warn('<<< Exiting multicats()', { "event.action": "multicats" });
    return this.client.send<number>({ cmd: 'broadcast' }, {}).pipe(
      scan((a, b) => a + b),
      take(2),
    );
  }

  @MessagePattern({ cmd: 'broadcast' })
  replyBroadcast(): Observable<number> {
	logger.error('>>> Entering replyBroadcast()', { "event.action": "replyBroadcast" });
	logger.warn('<<< Exiting replyBroadcast()', { "event.action": "replyBroadcast" });
    return new Observable(observer => observer.next(1));
  }
}
