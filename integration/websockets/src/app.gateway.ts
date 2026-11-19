const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { UseFilters, UseInterceptors } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { RequestInterceptor } from './request.interceptor.js';
import { throwError } from 'rxjs';
import { RequestFilter } from './request.filter.js';

@WebSocketGateway(8080)
export class ApplicationGateway {
  @SubscribeMessage('push')
  onPush(@MessageBody() data) {
	logger.error(`>>> Entering onPush(data=${data})`, { "event.action": "onPush" });
	logger.warn(`<<< Exiting onPush(data=${data})`, { "event.action": "onPush" });
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

  @UseFilters(RequestFilter)
  @SubscribeMessage('getClientWithError')
  getPathCalledWithError() {
	logger.error('>>> Entering getPathCalledWithError()', { "event.action": "getPathCalledWithError" });
	logger.warn('<<< Exiting getPathCalledWithError()', { "event.action": "getPathCalledWithError" });
    return throwError(() => new WsException('This is an error'));
  }
}
