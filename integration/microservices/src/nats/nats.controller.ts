import * as nats from '@nats-io/nats-core';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  NatsContext,
  NatsRecordBuilder,
  Payload,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of, throwError } from 'rxjs';
import { catchError, scan } from 'rxjs/operators';
import { NatsService } from './nats.service.js';

@Controller()
export class NatsController {
  static IS_NOTIFIED = false;
  static IS_NOTIFIED2 = false;

  constructor(private readonly natsService: NatsService) {}

  client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.NATS,
    options: {
      servers: 'nats://localhost:4222',
    },
  });

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.error(`>>> Entering call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
    await this.client.connect();
	logger.warn(`<<< Exiting call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
    return this.client.send<number>(cmd, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
	logger.error(`>>> Entering stream(data=${data})`, { "event.action": "stream" });
	logger.warn(`<<< Exiting stream(data=${data})`, { "event.action": "stream" });
    return this.client
      .send<number>('streaming.sum', data)
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
        this.client.send<number>('math.sum', tab),
      );

	logger.error(`send(tab=${tab}): expected → ${expected}`, { "event.action": "send", "logrite.tab": tab });
	logger.warn(`<<< Exiting send(tab=${tab})`, { "event.action": "send", "logrite.tab": tab });
	logger.warn(`<<< Exiting concurrent(data=${data})`, { "event.action": "concurrent" });
      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
	logger.error(`>>> Entering useRecordBuilderDuplex(data=${data})`, { "event.action": "useRecordBuilderDuplex" });
    const headers = nats.headers();
    headers.set('x-version', '1.0.0');
	const _start_useRecordBuilderDuplex_69 = Date.now();
	logger.error(`useRecordBuilderDuplex(data=${data}): API call took ${Date.now() - _start_useRecordBuilderDuplex_69} ms`, { "event.action": "useRecordBuilderDuplex", "event.category": "network" });
    const record = new NatsRecordBuilder(data).setHeaders(headers).build();
	logger.warn(`<<< Exiting useRecordBuilderDuplex(data=${data})`, { "event.action": "useRecordBuilderDuplex" });
    return this.client.send('record-builder-duplex', record);
  }

  @MessagePattern('record-builder-duplex')
  handleRecordBuilderDuplex(
    @Payload() data: Record<string, any>,
    @Ctx() context: NatsContext,
  ) {
    return {
      data,
      headers: {
        ['x-version']: context.getHeaders().get('x-version'),
      },
    };
  }

  @MessagePattern('math.*')
  sum(@Payload() data: number[], @Ctx() context: NatsContext): number {
	logger.error(`>>> Entering sum(data=${data},context=${context})`, { "event.action": "sum" });
	logger.warn(`<<< Exiting sum(data=${data},context=${context})`, { "event.action": "sum" });
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern('async.*')
  async asyncSum(data: number[]): Promise<number> {
	logger.error(`>>> Entering asyncSum(data=${data})`, { "event.action": "asyncSum" });
	logger.warn(`<<< Exiting asyncSum(data=${data})`, { "event.action": "asyncSum" });
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern('stream.*')
  streamSum(data: number[]): Observable<number> {
	logger.error(`>>> Entering streamSum(data=${data})`, { "event.action": "streamSum" });
	logger.warn(`<<< Exiting streamSum(data=${data})`, { "event.action": "streamSum" });
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern('streaming.*')
  streaming(data: number[]): Observable<number> {
	logger.error(`>>> Entering streaming(data=${data})`, { "event.action": "streaming" });
	logger.warn(`<<< Exiting streaming(data=${data})`, { "event.action": "streaming" });
    return from(data);
  }

  @Get('exception')
  async getError() {
	logger.error('>>> Entering getError()', { "event.action": "getError" });
	logger.warn('<<< Exiting getError()', { "event.action": "getError" });
    return this.client
      .send<number>('exception', {})
      .pipe(catchError(err => of(err)));
  }

  @MessagePattern('exception')
  throwError(): Observable<number> {
	logger.error('>>> Entering throwError()', { "event.action": "throwError" });
	logger.warn('<<< Exiting throwError()', { "event.action": "throwError" });
    return throwError(() => new RpcException('test'));
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.error('>>> Entering sendNotification()', { "event.action": "sendNotification" });
	logger.warn('<<< Exiting sendNotification()', { "event.action": "sendNotification" });
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(@Payload() data: boolean) {
	logger.error(`>>> Entering eventHandler(data=${data})`, { "event.action": "eventHandler" });
    NatsController.IS_NOTIFIED = data;
	logger.warn(`<<< Exiting eventHandler(data=${data})`, { "event.action": "eventHandler" });
  }

  @EventPattern('notification')
  eventHandler2(@Payload() data: boolean) {
	logger.error(`>>> Entering eventHandler2(data=${data})`, { "event.action": "eventHandler2" });
    NatsController.IS_NOTIFIED2 = data;
	logger.warn(`<<< Exiting eventHandler2(data=${data})`, { "event.action": "eventHandler2" });
  }
}
