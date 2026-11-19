const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
} from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { scan, take } from 'rxjs/operators';

@Controller()
export class RedisBroadcastController {
  @Client({ transport: Transport.REDIS })
  client: ClientProxy;

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
