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
	logger.debug(`>>> Entering onPush(data=${data})`);
	logger.debug(`<<< Exiting onPush(data=${data})`);
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

  @UseFilters(RequestFilter)
  @SubscribeMessage('getClientWithError')
  getPathCalledWithError() {
	logger.debug('>>> Entering getPathCalledWithError()');
	logger.debug('<<< Exiting getPathCalledWithError()');
    return throwError(() => new WsException('This is an error'));
  }
}
