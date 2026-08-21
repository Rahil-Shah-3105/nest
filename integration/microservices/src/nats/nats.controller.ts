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
	logger.debug(`>>> Entering call(cmd=${cmd},data=${data})`);
    await this.client.connect();
	logger.debug(`<<< Exiting call(cmd=${cmd},data=${data})`);
    return this.client.send<number>(cmd, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
	logger.debug(`>>> Entering stream(data=${data})`);
	logger.debug(`<<< Exiting stream(data=${data})`);
    return this.client
      .send<number>('streaming.sum', data)
      .pipe(scan((a, b) => a + b));
  }

  @Post('concurrent')
  @HttpCode(200)
  concurrent(@Body() data: number[][]): Promise<boolean> {
    const send = async (tab: number[]) => {
	logger.debug(`>>> Entering concurrent(data=${data})`);
      const expected = tab.reduce((a, b) => a + b);
      const result = await lastValueFrom(
        this.client.send<number>('math.sum', tab),
      );
	logger.debug(`>>> Entering send(tab=${tab})`);

	logger.debug(`<<< Exiting send(tab=${tab})`);
	logger.debug(`<<< Exiting concurrent(data=${data})`);
      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
	logger.debug(`>>> Entering useRecordBuilderDuplex(data=${data})`);
    const headers = nats.headers();
    headers.set('x-version', '1.0.0');
	const _start_useRecordBuilderDuplex = Date.now();
	logger.info(`useRecordBuilderDuplex(data=${data}): API call took ${Date.now() - _start_useRecordBuilderDuplex} ms`);
    const record = new NatsRecordBuilder(data).setHeaders(headers).build();
	logger.debug(`<<< Exiting useRecordBuilderDuplex(data=${data})`);
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
	logger.debug(`>>> Entering sum(data=${data},context=${context})`);
	logger.debug(`<<< Exiting sum(data=${data},context=${context})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern('async.*')
  async asyncSum(data: number[]): Promise<number> {
	logger.debug(`>>> Entering asyncSum(data=${data})`);
	logger.debug(`<<< Exiting asyncSum(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern('stream.*')
  streamSum(data: number[]): Observable<number> {
	logger.debug(`>>> Entering streamSum(data=${data})`);
	logger.debug(`<<< Exiting streamSum(data=${data})`);
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern('streaming.*')
  streaming(data: number[]): Observable<number> {
	logger.debug(`>>> Entering streaming(data=${data})`);
	logger.debug(`<<< Exiting streaming(data=${data})`);
    return from(data);
  }

  @Get('exception')
  async getError() {
	logger.debug('>>> Entering getError()');
	logger.debug('<<< Exiting getError()');
    return this.client
      .send<number>('exception', {})
      .pipe(catchError(err => of(err)));
  }

  @MessagePattern('exception')
  throwError(): Observable<number> {
	logger.debug('>>> Entering throwError()');
	logger.debug('<<< Exiting throwError()');
    return throwError(() => new RpcException('test'));
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.debug('>>> Entering sendNotification()');
	logger.debug('<<< Exiting sendNotification()');
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(@Payload() data: boolean) {
	logger.debug(`>>> Entering eventHandler(data=${data})`);
    NatsController.IS_NOTIFIED = data;
	logger.debug(`eventHandler(data=${data}): NatsController.IS_NOTIFIED → ${NatsController.IS_NOTIFIED}`);
  }

  @EventPattern('notification')
  eventHandler2(@Payload() data: boolean) {
	logger.debug(`>>> Entering eventHandler2(data=${data})`);
    NatsController.IS_NOTIFIED2 = data;
	logger.debug(`<<< Exiting eventHandler2(data=${data})`);
  }
}
