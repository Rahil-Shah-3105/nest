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
	logger.debug(`>>> Entering onPush(client=${client},data=${data})`);
	logger.debug(`<<< Exiting onPush(client=${client},data=${data})`);
    return {
      event: 'pop',
      data,
    };
  }
}
