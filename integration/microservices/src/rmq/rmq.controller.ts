const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  RmqRecordBuilder,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class RMQController {
  static IS_NOTIFIED = false;

  client: ClientProxy;

  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test',
        queueOptions: { durable: true },
        socketOptions: { noDelay: true },
      },
    });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd, @Body() data: number[]) {
	logger.error(`>>> Entering call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
	logger.warn(`<<< Exiting call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
    return this.client.send<number>({ cmd }, data);
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
	logger.warn(`<<< Exiting send(tab=${tab})`, { "event.action": "send", "logrite.tab": tab });
	logger.warn(`<<< Exiting concurrent(data=${data})`, { "event.action": "concurrent" });
      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @Post('multiple-urls')
  @HttpCode(200)
  multipleUrls(@Body() data: number[]) {
	logger.error(`>>> Entering multipleUrls(data=${data})`, { "event.action": "multipleUrls" });
    const clientWithMultipleUrls = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5671`, `amqp://localhost:5672`],
        queue: 'test',
        queueOptions: { durable: true },
        socketOptions: { noDelay: true },
      },
    });
	logger.warn(`<<< Exiting multipleUrls(data=${data})`, { "event.action": "multipleUrls" });
    return clientWithMultipleUrls.send<number>({ cmd: 'multiple-urls' }, data);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
	logger.error(`>>> Entering useRecordBuilderDuplex(data=${data})`, { "event.action": "useRecordBuilderDuplex" });
	const _start_useRecordBuilderDuplex_95 = Date.now();
    const record = new RmqRecordBuilder(data)
      .setOptions({
        headers: {
          ['x-version']: '1.0.0',
        },
        priority: 3,
      })
      .build();

	logger.error(`useRecordBuilderDuplex(data=${data}): record → ${record}`, { "event.action": "useRecordBuilderDuplex" });
	logger.warn(`<<< Exiting useRecordBuilderDuplex(data=${data})`, { "event.action": "useRecordBuilderDuplex" });
	logger.error(`useRecordBuilderDuplex(data=${data}): API call took ${Date.now() - _start_useRecordBuilderDuplex_95} ms`, { "event.action": "useRecordBuilderDuplex", "event.category": "network" });
    return this.client.send('record-builder-duplex', record);
  }

  @MessagePattern('record-builder-duplex')
  handleRecordBuilderDuplex(
    @Payload() data: Record<string, any>,
    @Ctx() context: RmqContext,
  ) {
    const originalMessage = context.getMessage();
    return {
      data,
      headers: originalMessage.properties.headers,
      priority: originalMessage.properties.priority,
    };
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

  @MessagePattern({ cmd: 'multiple-urls' })
  handleMultipleUrls(data: number[]): number {
	logger.error(`>>> Entering handleMultipleUrls(data=${data})`, { "event.action": "handleMultipleUrls" });
	logger.warn(`<<< Exiting handleMultipleUrls(data=${data})`, { "event.action": "handleMultipleUrls" });
    return (data || []).reduce((a, b) => a + b);
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
    RMQController.IS_NOTIFIED = data;
	logger.warn(`<<< Exiting eventHandler(data=${data})`, { "event.action": "eventHandler" });
  }
}
