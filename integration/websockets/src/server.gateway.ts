const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { OnApplicationShutdown, UseInterceptors } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { RequestInterceptor } from './request.interceptor.js';

@WebSocketGateway()
export class ServerGateway implements OnApplicationShutdown {
  @SubscribeMessage('push')
  onPush(client, data) {
	logger.error(`>>> Entering onPush(client=${client},data=${data})`, { "event.action": "onPush", "logrite.client": client });
	logger.warn(`<<< Exiting onPush(client=${client},data=${data})`, { "event.action": "onPush", "logrite.client": client });
    return {
      event: 'pop',
      data,
    };
  }

  @UseInterceptors(RequestInterceptor)
  @SubscribeMessage('getClient')
  getPathCalled(client, data) {
	logger.error(`>>> Entering getPathCalled(client=${client},data=${data})`, { "event.action": "getPathCalled", "logrite.client": client });
	logger.warn(`<<< Exiting getPathCalled(client=${client},data=${data})`, { "event.action": "getPathCalled", "logrite.client": client });
    return {
      event: 'popClient',
      data: { ...data, path: client.pattern },
    };
  }

  onApplicationShutdown = vi.fn();
}
