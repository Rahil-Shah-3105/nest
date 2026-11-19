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
	logger.error('>>> Entering onPush()', { "event.action": "onPush" });
	logger.warn('<<< Exiting onPush()', { "event.action": "onPush" });
    return 'pong';
  }

  @SubscribeMessage('manual-ack')
  async handleManualAck(
    @MessageBody() data: any,
    @Ack() ack: (response: any) => void,
  ) {
	logger.error(`>>> Entering handleManualAck(data=${data},ack=${ack})`, { "event.action": "handleManualAck", "logrite.ack": ack });
    await new Promise(resolve => setTimeout(resolve, 20));

    if (data.shouldSucceed) {
      ack({ status: 'success', data });
    } else {
      ack({ status: 'error', message: 'Operation failed' });
	logger.warn(`<<< Exiting handleManualAck(data=${data},ack=${ack})`, { "event.action": "handleManualAck", "logrite.ack": ack });
    }
    return { status: 'ignored' };
  }
}
