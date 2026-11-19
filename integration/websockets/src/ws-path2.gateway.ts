const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  path: '/ws-path',
})
export class WsPathGateway2 {
  @SubscribeMessage('push')
  onPush(client, data) {
	logger.error(`>>> Entering onPush(client=${client},data=${data})`, { "event.action": "onPush", "logrite.client": client });
	logger.warn(`<<< Exiting onPush(client=${client},data=${data})`, { "event.action": "onPush", "logrite.client": client });
    return {
      event: 'pop',
      data,
    };
  }
}
