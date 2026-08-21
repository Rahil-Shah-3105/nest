const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  Ctx,
  EventPattern,
  MessagePattern,
  MqttContext,
  MqttRecordBuilder,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class MqttController {
  static IS_NOTIFIED = false;
  static IS_WILDCARD_EVENT_RECEIVED = false;
  static IS_WILDCARD2_EVENT_RECEIVED = false;
  static IS_SHARED_WILDCARD_EVENT_RECEIVED = false;
  static IS_SHARED_WILDCARD2_EVENT_RECEIVED = false;

  @Client({ transport: Transport.MQTT })
  client: ClientProxy;

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.debug(`>>> Entering call(cmd=${cmd},data=${data})`);
    await this.client.connect();
	logger.debug(`<<< Exiting call(cmd=${cmd},data=${data})`);
    return this.client.send<number>({ cmd }, data);
  }

  @Post('stream')
  @HttpCode(200)
  async stream(@Body() data: number[]) {
	logger.debug(`>>> Entering stream(data=${data})`);
    const result = lastValueFrom(
      this.client
        .send<number>({ cmd: 'streaming' }, data)
        .pipe(scan((a, b) => a + b, 0)),
    );
	logger.debug(`stream(data=${data}): result → ${result}`);
    return result;
  }

  @Post('concurrent')
  @HttpCode(200)
  async concurrent(@Body() data: number[][]): Promise<boolean> {
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

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.debug('>>> Entering sendNotification()');
	logger.debug('<<< Exiting sendNotification()');
    return this.client.emit<number>('notification', true);
  }

  @Post('wildcard-event')
  async sendWildcardEvent(): Promise<any> {
	logger.debug('>>> Entering sendWildcardEvent()');
	logger.debug('<<< Exiting sendWildcardEvent()');
    return this.client.emit<number>('wildcard-event/test', true);
  }

  @Post('wildcard-message')
  async sendWildcardMessage(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.debug(`>>> Entering sendWildcardMessage(data=${data})`);
    await this.client.connect();
	logger.debug(`<<< Exiting sendWildcardMessage(data=${data})`);
    return this.client.send<number>('wildcard-message/test', data);
  }

  @Post('wildcard-event2')
  async sendWildcardEvent2(): Promise<any> {
	logger.debug('>>> Entering sendWildcardEvent2()');
	logger.debug('<<< Exiting sendWildcardEvent2()');
    return this.client.emit<number>('wildcard-event2/test/test', true);
  }

  @Post('wildcard-message2')
  async sendWildcardMessage2(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.debug(`>>> Entering sendWildcardMessage2(data=${data})`);
    await this.client.connect();
	logger.debug(`<<< Exiting sendWildcardMessage2(data=${data})`);
    return this.client.send<number>('wildcard-message2/test/test', data);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
	logger.debug(`>>> Entering useRecordBuilderDuplex(data=${data})`);
    const record = new MqttRecordBuilder(data).setQoS(1).build();
	logger.debug(`useRecordBuilderDuplex(data=${data}): record → ${record}`);
    return this.client.send('record-builder-duplex', record);
  }

  @MessagePattern('record-builder-duplex')
  handleRecordBuilderDuplex(
    @Payload() data: Record<string, any>,
    @Ctx() context: MqttContext,
  ) {
    const { qos } = context.getPacket();
    return {
      data,
      qos,
    };
  }

  @Post('shared-wildcard-event')
  async sendSharedWildcardEvent(): Promise<any> {
	logger.debug('>>> Entering sendSharedWildcardEvent()');
	logger.debug('<<< Exiting sendSharedWildcardEvent()');
    return this.client.emit<number>('shared-wildcard-event/test', true);
  }

  @Post('shared-wildcard-message')
  async sendSharedWildcardMessage(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.debug(`>>> Entering sendSharedWildcardMessage(data=${data})`);
    await this.client.connect();
	logger.debug(`<<< Exiting sendSharedWildcardMessage(data=${data})`);
    return this.client.send<number>('shared-wildcard-message/test', data);
  }

  @Post('shared-wildcard-event2')
  async sendSharedWildcardEvent2(): Promise<any> {
	logger.debug('>>> Entering sendSharedWildcardEvent2()');
	logger.debug('<<< Exiting sendSharedWildcardEvent2()');
    return this.client.emit<number>('shared-wildcard-event2/test/test', true);
  }

  @Post('shared-wildcard-message2')
  async sendSharedWildcardMessage2(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.debug(`>>> Entering sendSharedWildcardMessage2(data=${data})`);
    await this.client.connect();
	logger.debug(`<<< Exiting sendSharedWildcardMessage2(data=${data})`);
    return this.client.send<number>('shared-wildcard-message2/test/test', data);
  }

  @MessagePattern('wildcard-message/#')
  wildcardMessageHandler(data: number[]): number | undefined {
    if ((data as any).response) {
	logger.debug(`>>> Entering wildcardMessageHandler(data=${data})`);
	logger.debug(`<<< Exiting wildcardMessageHandler(data=${data})`);
      return;
    }
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('wildcard-event/#')
  wildcardEventHandler(data: boolean) {
	logger.debug(`>>> Entering wildcardEventHandler(data=${data})`);
    MqttController.IS_WILDCARD_EVENT_RECEIVED = data;
	logger.debug(`wildcardEventHandler(data=${data}): MqttController.IS_WILDCARD_EVENT_RECEIVED → ${MqttController.IS_WILDCARD_EVENT_RECEIVED}`);
  }

  @MessagePattern('wildcard-message2/+/test')
  wildcardMessageHandler2(data: number[]): number {
	logger.debug(`>>> Entering wildcardMessageHandler2(data=${data})`);
	logger.debug(`<<< Exiting wildcardMessageHandler2(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('wildcard-event2/+/test')
  wildcardEventHandler2(data: boolean) {
	logger.debug(`>>> Entering wildcardEventHandler2(data=${data})`);
    MqttController.IS_WILDCARD2_EVENT_RECEIVED = data;
	logger.debug(`wildcardEventHandler2(data=${data}): MqttController.IS_WILDCARD2_EVENT_RECEIVED → ${MqttController.IS_WILDCARD2_EVENT_RECEIVED}`);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
	logger.debug(`>>> Entering eventHandler(data=${data})`);
    MqttController.IS_NOTIFIED = data;
	logger.debug(`eventHandler(data=${data}): MqttController.IS_NOTIFIED → ${MqttController.IS_NOTIFIED}`);
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

  @MessagePattern('$share/test-group/shared-wildcard-message/#')
  sharedWildcardMessageHandler(data: number[]): number | undefined {
    if ((data as any).response) {
	logger.debug(`>>> Entering sharedWildcardMessageHandler(data=${data})`);
	logger.debug(`<<< Exiting sharedWildcardMessageHandler(data=${data})`);
      return;
    }
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('$share/test-group/shared-wildcard-event/#')
  sharedWildcardEventHandler(data: boolean) {
	logger.debug(`>>> Entering sharedWildcardEventHandler(data=${data})`);
    MqttController.IS_SHARED_WILDCARD_EVENT_RECEIVED = data;
	logger.debug(`sharedWildcardEventHandler(data=${data}): MqttController.IS_SHARED_WILDCARD_EVENT_RECEIVED → ${MqttController.IS_SHARED_WILDCARD_EVENT_RECEIVED}`);
  }

  @MessagePattern('$share/test-group/shared-wildcard-message2/+/test')
  sharedWildcardMessageHandler2(data: number[]): number {
	logger.debug(`>>> Entering sharedWildcardMessageHandler2(data=${data})`);
	logger.debug(`<<< Exiting sharedWildcardMessageHandler2(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('$share/test-group/shared-wildcard-event2/+/test')
  sharedWildcardEventHandler2(data: boolean) {
	logger.debug(`>>> Entering sharedWildcardEventHandler2(data=${data})`);
    MqttController.IS_SHARED_WILDCARD2_EVENT_RECEIVED = data;
	logger.debug(`<<< Exiting sharedWildcardEventHandler2(data=${data})`);
  }
}
