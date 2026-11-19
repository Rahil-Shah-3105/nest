const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  path: '/example',
})
export class ExamplePathGateway {
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
