const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('events')
  findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
	logger.error(`>>> Entering findAll(data=${data})`, { "event.action": "findAll" });
	logger.warn(`<<< Exiting findAll(data=${data})`, { "event.action": "findAll" });
    return from([1, 2, 3]).pipe(map(item => ({ event: 'events', data: item })));
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
	logger.error(`>>> Entering identity(data=${data})`, { "event.action": "identity" });
	logger.warn(`<<< Exiting identity(data=${data})`, { "event.action": "identity" });
    return data;
  }
}
