const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Ack,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway(8080)
export class AckGateway {
  @SubscribeMessage('push')
  onPush() {
	logger.debug('>>> Entering onPush()');
	logger.debug('<<< Exiting onPush()');
    return 'pong';
  }

  @SubscribeMessage('manual-ack')
  async handleManualAck(
    @MessageBody() data: any,
    @Ack() ack: (response: any) => void,
  ) {
	logger.debug(`>>> Entering handleManualAck(data=${data},ack=${ack})`);
    await new Promise(resolve => setTimeout(resolve, 20));

    if (data.shouldSucceed) {
      ack({ status: 'success', data });
    } else {
      ack({ status: 'error', message: 'Operation failed' });
	logger.debug(`<<< Exiting handleManualAck(data=${data},ack=${ack})`);
    }
    return { status: 'ignored' };
  }
}
