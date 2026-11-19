const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  MessagePattern,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of, throwError } from 'rxjs';
import { catchError, scan } from 'rxjs/operators';

@Controller()
export class AppController {
  constructor(
    @Inject('USE_CLASS_CLIENT') private useClassClient: ClientProxy,
    @Inject('USE_FACTORY_CLIENT') private useFactoryClient: ClientProxy,
    @Inject('CUSTOM_PROXY_CLIENT') private customClient: ClientProxy,
  ) {}
  static IS_NOTIFIED = false;

  @Client({ transport: Transport.TCP })
  client: ClientProxy;

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd, @Body() data: number[]): Observable<number> {
	logger.error(`>>> Entering call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
	logger.warn(`<<< Exiting call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
    return this.client.send<number>({ cmd }, data);
  }

  @Post('useFactory')
  @HttpCode(200)
  callWithClientUseFactory(
    @Query('command') cmd,
    @Body() data: number[],
  ): Observable<number> {
    return this.useFactoryClient.send<number>({ cmd }, data);
  }

  @Post('useClass')
  @HttpCode(200)
  callWithClientUseClass(
    @Query('command') cmd,
    @Body() data: number[],
  ): Observable<number> {
    return this.useClassClient.send<number>({ cmd }, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
	logger.error(`>>> Entering stream(data=${data})`, { "event.action": "stream" });
	logger.warn(`<<< Exiting stream(data=${data})`, { "event.action": "stream" });
    return this.client
      .send<number>({ cmd: 'streaming' }, data)
      .pipe(scan((a, b) => a + b));
  }

  @Post('concurrent')
  @HttpCode(200)
  concurrent(@Body() data: number[][]): Promise<boolean> {
	logger.error(`>>> Entering concurrent(data=${data})`, { "event.action": "concurrent" });
    const send = async (tab: number[]) => {
	logger.error(`>>> Entering send(tab=${tab})`, { "event.action": "send", "logrite.tab": tab });
      const expected = tab.reduce((a, b) => a + b);
      const result = await lastValueFrom(
        this.client.send<number>({ cmd: 'sum' }, tab),
      );

	logger.error(`send(tab=${tab}): expected → ${expected}`, { "event.action": "send", "logrite.tab": tab });
	logger.warn(`<<< Exiting concurrent(data=${data})`, { "event.action": "concurrent" });
      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @Post('error')
  @HttpCode(200)
  serializeError(
    @Query('client') query: 'custom' | 'standard' = 'standard',
    @Body() body: Record<string, any>,
  ): Observable<boolean> {
    const client = query === 'custom' ? this.customClient : this.client;
    return client.send({ cmd: 'err' }, {}).pipe(
      catchError(err => {
		logger.error(`serializeError(query=${query},body=${body}): client → ${client}`, { "event.action": "serializeError", "logrite.query": query });
        return of(err instanceof RpcException);
      }),
    );
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
	logger.error(`>>> Entering sum(data=${data})`, { "event.action": "sum" });
	logger.warn(`<<< Exiting sum(data=${data})`, { "event.action": "sum" });
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'asyncSum' })
  async asyncSum(data: number[]): Promise<number> {
	logger.error(`>>> Entering asyncSum(data=${data})`, { "event.action": "asyncSum" });
	logger.warn(`<<< Exiting asyncSum(data=${data})`, { "event.action": "asyncSum" });
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'streamSum' })
  streamSum(data: number[]): Observable<number> {
	logger.error(`>>> Entering streamSum(data=${data})`, { "event.action": "streamSum" });
	logger.warn(`<<< Exiting streamSum(data=${data})`, { "event.action": "streamSum" });
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern({ cmd: 'streaming' })
  streaming(data: number[]): Observable<number> {
	logger.error(`>>> Entering streaming(data=${data})`, { "event.action": "streaming" });
	logger.warn(`<<< Exiting streaming(data=${data})`, { "event.action": "streaming" });
    return from(data);
  }

  @MessagePattern({ cmd: 'err' })
  throwAnError() {
	logger.error('>>> Entering throwAnError()', { "event.action": "throwAnError" });
	logger.warn('<<< Exiting throwAnError()', { "event.action": "throwAnError" });
    return throwError(() => new Error('err'));
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.error('>>> Entering sendNotification()', { "event.action": "sendNotification" });
	logger.warn('<<< Exiting sendNotification()', { "event.action": "sendNotification" });
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
	logger.error(`>>> Entering eventHandler(data=${data})`, { "event.action": "eventHandler" });
    AppController.IS_NOTIFIED = data;
	logger.warn(`<<< Exiting eventHandler(data=${data})`, { "event.action": "eventHandler" });
  }
}
