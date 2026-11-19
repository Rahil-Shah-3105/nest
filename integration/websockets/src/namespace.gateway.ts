const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';

@WebSocketGateway(8080, {
  namespace: 'test',
})
export class NamespaceGateway {
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
