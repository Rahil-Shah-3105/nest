const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { throwError } from 'rxjs';

@WebSocketGateway(8080)
export class ErrorGateway {
  @SubscribeMessage('push')
  onPush() {
	logger.debug('>>> Entering onPush()');
	logger.debug('<<< Exiting onPush()');
    return throwError(() => new WsException('test'));
  }
}
