const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { OnApplicationShutdown, UseInterceptors } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { RequestInterceptor } from './request.interceptor.js';

@WebSocketGateway()
export class ServerGateway implements OnApplicationShutdown {
  @SubscribeMessage('push')
  onPush(client, data) {
	logger.debug(`>>> Entering onPush(client=${client},data=${data})`);
	logger.debug(`<<< Exiting onPush(client=${client},data=${data})`);
    return {
      event: 'pop',
      data,
    };
  }

  @UseInterceptors(RequestInterceptor)
  @SubscribeMessage('getClient')
  getPathCalled(client, data) {
	logger.debug(`>>> Entering getPathCalled(client=${client},data=${data})`);
	logger.debug(`<<< Exiting getPathCalled(client=${client},data=${data})`);
    return {
      event: 'popClient',
      data: { ...data, path: client.pattern },
    };
  }

  onApplicationShutdown = vi.fn();
}
