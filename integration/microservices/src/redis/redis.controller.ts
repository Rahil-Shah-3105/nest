const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class RedisController {
  static IS_NOTIFIED = false;

  @Client({ transport: Transport.REDIS })
  client: ClientProxy;

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd, @Body() data: number[]): Observable<number> {
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

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.debug('>>> Entering sendNotification()');
	logger.debug('<<< Exiting sendNotification()');
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
	logger.debug(`>>> Entering eventHandler(data=${data})`);
    RedisController.IS_NOTIFIED = data;
	logger.debug(`<<< Exiting eventHandler(data=${data})`);
  }
}
