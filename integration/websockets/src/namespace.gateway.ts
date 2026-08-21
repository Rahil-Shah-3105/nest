const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';

@WebSocketGateway(8080, {
  namespace: 'test',
})
export class NamespaceGateway {
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
