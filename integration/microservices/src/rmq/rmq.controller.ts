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
	logger.debug('>>> Entering constructor()');
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test',
        queueOptions: { durable: true },
        socketOptions: { noDelay: true },
      },
    });
	logger.debug('<<< Exiting constructor()');
  }

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd, @Body() data: number[]) {
	logger.debug(`>>> Entering call(cmd=${cmd},data=${data})`);
	logger.debug(`<<< Exiting call(cmd=${cmd},data=${data})`);
    return this.client.send<number>({ cmd }, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
	logger.debug(`>>> Entering stream(data=${data})`);
	logger.debug(`<<< Exiting stream(data=${data})`);
    return this.client
      .send<number>({ cmd: 'streaming' }, data)
      .pipe(scan((a, b) => a + b));
  }

  @Post('concurrent')
  @HttpCode(200)
  concurrent(@Body() data: number[][]): Promise<boolean> {
    const send = async (tab: number[]) => {
	logger.debug(`>>> Entering concurrent(data=${data})`);
      const expected = tab.reduce((a, b) => a + b);
      const result = await lastValueFrom(
        this.client.send<number>({ cmd: 'sum' }, tab),
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

  @Post('multiple-urls')
  @HttpCode(200)
  multipleUrls(@Body() data: number[]) {
	logger.debug(`>>> Entering multipleUrls(data=${data})`);
    const clientWithMultipleUrls = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5671`, `amqp://localhost:5672`],
        queue: 'test',
        queueOptions: { durable: true },
        socketOptions: { noDelay: true },
      },
    });
	logger.debug(`<<< Exiting multipleUrls(data=${data})`);
    return clientWithMultipleUrls.send<number>({ cmd: 'multiple-urls' }, data);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
	logger.debug(`>>> Entering useRecordBuilderDuplex(data=${data})`);
    const record = new RmqRecordBuilder(data)
      .setOptions({
        headers: {
          ['x-version']: '1.0.0',
        },
        priority: 3,
      })
      .build();

	logger.debug(`useRecordBuilderDuplex(data=${data}): record → ${record}`);
	logger.debug(`<<< Exiting useRecordBuilderDuplex(data=${data})`);
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
	logger.debug(`>>> Entering sum(data=${data})`);
	logger.debug(`<<< Exiting sum(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'asyncSum' })
  async asyncSum(data: number[]): Promise<number> {
	logger.debug(`>>> Entering asyncSum(data=${data})`);
	logger.debug(`<<< Exiting asyncSum(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'streamSum' })
  streamSum(data: number[]): Observable<number> {
	logger.debug(`>>> Entering streamSum(data=${data})`);
	logger.debug(`<<< Exiting streamSum(data=${data})`);
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern({ cmd: 'streaming' })
  streaming(data: number[]): Observable<number> {
	logger.debug(`>>> Entering streaming(data=${data})`);
	logger.debug(`<<< Exiting streaming(data=${data})`);
    return from(data);
  }

  @MessagePattern({ cmd: 'multiple-urls' })
  handleMultipleUrls(data: number[]): number {
	logger.debug(`>>> Entering handleMultipleUrls(data=${data})`);
	logger.debug(`<<< Exiting handleMultipleUrls(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.debug('>>> Entering sendNotification()');
	logger.debug('<<< Exiting sendNotification()');
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
	logger.debug(`>>> Entering eventHandler(data=${data})`);
    RMQController.IS_NOTIFIED = data;
	logger.debug(`<<< Exiting eventHandler(data=${data})`);
  }
}
