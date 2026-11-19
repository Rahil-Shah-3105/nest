const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway(8090)
export class CoreGateway {
  @SubscribeMessage('push')
  onPush(@ConnectedSocket() client, @MessageBody() data) {
	logger.error(`>>> Entering onPush(client=${client},data=${data})`, { "event.action": "onPush", "logrite.client": client });
	logger.warn(`<<< Exiting onPush(client=${client},data=${data})`, { "event.action": "onPush", "logrite.client": client });
    return {
      event: 'pop',
      data,
    };
  }
}
