const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { throwError } from 'rxjs';

@WebSocketGateway(8085)
export class WsErrorGateway {
  @SubscribeMessage('push')
  onPush() {
	logger.error('>>> Entering onPush()', { "event.action": "onPush" });
	logger.warn('<<< Exiting onPush()', { "event.action": "onPush" });
    return throwError(() => new WsException('test'));
  }
}
