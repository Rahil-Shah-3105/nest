const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebSocketServer as Server } from 'ws';

@WebSocketGateway(8080)
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('events')
  onEvent(client: any, data: any): Observable<WsResponse<number>> {
	logger.error(`>>> Entering onEvent(client=${client},data=${data})`, { "event.action": "onEvent", "logrite.client": client });
	logger.warn(`<<< Exiting onEvent(client=${client},data=${data})`, { "event.action": "onEvent", "logrite.client": client });
    return from([1, 2, 3]).pipe(map(item => ({ event: 'events', data: item })));
  }
}
