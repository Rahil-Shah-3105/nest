const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  path: '/ws-path',
})
export class WsPathGateway2 {
  @SubscribeMessage('push')
  onPush(client, data) {
	logger.debug(`>>> Entering onPush(client=${client},data=${data})`);
	logger.debug(`<<< Exiting onPush(client=${client},data=${data})`);
    return {
      event: 'pop',
      data,
    };
  }
}
