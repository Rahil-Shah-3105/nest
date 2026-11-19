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
	logger.error(`>>> Entering call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
    await this.client.connect();
	logger.warn(`<<< Exiting call(cmd=${cmd},data=${data})`, { "event.action": "call", "logrite.cmd": cmd });
    return this.client.send<number>({ cmd }, data);
  }

  @Post('stream')
  @HttpCode(200)
  async stream(@Body() data: number[]) {
	logger.error(`>>> Entering stream(data=${data})`, { "event.action": "stream" });
    const result = lastValueFrom(
      this.client
        .send<number>({ cmd: 'streaming' }, data)
        .pipe(scan((a, b) => a + b, 0)),
    );
	logger.error(`stream(data=${data}): result → ${result}`, { "event.action": "stream" });
    return result;
  }

  @Post('concurrent')
  @HttpCode(200)
  async concurrent(@Body() data: number[][]): Promise<boolean> {
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

  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.error('>>> Entering sendNotification()', { "event.action": "sendNotification" });
	logger.warn('<<< Exiting sendNotification()', { "event.action": "sendNotification" });
    return this.client.emit<number>('notification', true);
  }

  @Post('wildcard-event')
  async sendWildcardEvent(): Promise<any> {
	logger.error('>>> Entering sendWildcardEvent()', { "event.action": "sendWildcardEvent" });
	logger.warn('<<< Exiting sendWildcardEvent()', { "event.action": "sendWildcardEvent" });
    return this.client.emit<number>('wildcard-event/test', true);
  }

  @Post('wildcard-message')
  async sendWildcardMessage(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.error(`>>> Entering sendWildcardMessage(data=${data})`, { "event.action": "sendWildcardMessage" });
    await this.client.connect();
	logger.warn(`<<< Exiting sendWildcardMessage(data=${data})`, { "event.action": "sendWildcardMessage" });
    return this.client.send<number>('wildcard-message/test', data);
  }

  @Post('wildcard-event2')
  async sendWildcardEvent2(): Promise<any> {
	logger.error('>>> Entering sendWildcardEvent2()', { "event.action": "sendWildcardEvent2" });
	logger.warn('<<< Exiting sendWildcardEvent2()', { "event.action": "sendWildcardEvent2" });
    return this.client.emit<number>('wildcard-event2/test/test', true);
  }

  @Post('wildcard-message2')
  async sendWildcardMessage2(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.error(`>>> Entering sendWildcardMessage2(data=${data})`, { "event.action": "sendWildcardMessage2" });
    await this.client.connect();
	logger.warn(`<<< Exiting sendWildcardMessage2(data=${data})`, { "event.action": "sendWildcardMessage2" });
    return this.client.send<number>('wildcard-message2/test/test', data);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
	logger.error(`>>> Entering useRecordBuilderDuplex(data=${data})`, { "event.action": "useRecordBuilderDuplex" });
    const record = new MqttRecordBuilder(data).setQoS(1).build();
	logger.error(`useRecordBuilderDuplex(data=${data}): record → ${record}`, { "event.action": "useRecordBuilderDuplex" });
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
	logger.error('>>> Entering sendSharedWildcardEvent()', { "event.action": "sendSharedWildcardEvent" });
	logger.warn('<<< Exiting sendSharedWildcardEvent()', { "event.action": "sendSharedWildcardEvent" });
    return this.client.emit<number>('shared-wildcard-event/test', true);
  }

  @Post('shared-wildcard-message')
  async sendSharedWildcardMessage(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.error(`>>> Entering sendSharedWildcardMessage(data=${data})`, { "event.action": "sendSharedWildcardMessage" });
    await this.client.connect();
	logger.warn(`<<< Exiting sendSharedWildcardMessage(data=${data})`, { "event.action": "sendSharedWildcardMessage" });
    return this.client.send<number>('shared-wildcard-message/test', data);
  }

  @Post('shared-wildcard-event2')
  async sendSharedWildcardEvent2(): Promise<any> {
	logger.error('>>> Entering sendSharedWildcardEvent2()', { "event.action": "sendSharedWildcardEvent2" });
	logger.warn('<<< Exiting sendSharedWildcardEvent2()', { "event.action": "sendSharedWildcardEvent2" });
    return this.client.emit<number>('shared-wildcard-event2/test/test', true);
  }

  @Post('shared-wildcard-message2')
  async sendSharedWildcardMessage2(
    @Body() data: number[],
  ): Promise<Observable<number>> {
	logger.error(`>>> Entering sendSharedWildcardMessage2(data=${data})`, { "event.action": "sendSharedWildcardMessage2" });
    await this.client.connect();
	logger.warn(`<<< Exiting sendSharedWildcardMessage2(data=${data})`, { "event.action": "sendSharedWildcardMessage2" });
    return this.client.send<number>('shared-wildcard-message2/test/test', data);
  }

  @MessagePattern('wildcard-message/#')
  wildcardMessageHandler(data: number[]): number | undefined {
	logger.error(`>>> Entering wildcardMessageHandler(data=${data})`, { "event.action": "wildcardMessageHandler" });
    if ((data as any).response) {
      return;
    }
	logger.warn(`<<< Exiting wildcardMessageHandler(data=${data})`, { "event.action": "wildcardMessageHandler" });
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('wildcard-event/#')
  wildcardEventHandler(data: boolean) {
	logger.error(`>>> Entering wildcardEventHandler(data=${data})`, { "event.action": "wildcardEventHandler" });
    MqttController.IS_WILDCARD_EVENT_RECEIVED = data;
	logger.warn(`<<< Exiting wildcardEventHandler(data=${data})`, { "event.action": "wildcardEventHandler" });
  }

  @MessagePattern('wildcard-message2/+/test')
  wildcardMessageHandler2(data: number[]): number {
	logger.error(`>>> Entering wildcardMessageHandler2(data=${data})`, { "event.action": "wildcardMessageHandler2" });
	logger.warn(`<<< Exiting wildcardMessageHandler2(data=${data})`, { "event.action": "wildcardMessageHandler2" });
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('wildcard-event2/+/test')
  wildcardEventHandler2(data: boolean) {
	logger.error(`>>> Entering wildcardEventHandler2(data=${data})`, { "event.action": "wildcardEventHandler2" });
    MqttController.IS_WILDCARD2_EVENT_RECEIVED = data;
	logger.warn(`<<< Exiting wildcardEventHandler2(data=${data})`, { "event.action": "wildcardEventHandler2" });
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
	logger.error(`>>> Entering eventHandler(data=${data})`, { "event.action": "eventHandler" });
    MqttController.IS_NOTIFIED = data;
	logger.warn(`<<< Exiting eventHandler(data=${data})`, { "event.action": "eventHandler" });
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

  @MessagePattern('$share/test-group/shared-wildcard-message/#')
  sharedWildcardMessageHandler(data: number[]): number | undefined {
	logger.error(`>>> Entering sharedWildcardMessageHandler(data=${data})`, { "event.action": "sharedWildcardMessageHandler" });
    if ((data as any).response) {
      return;
    }
	logger.warn(`<<< Exiting sharedWildcardMessageHandler(data=${data})`, { "event.action": "sharedWildcardMessageHandler" });
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('$share/test-group/shared-wildcard-event/#')
  sharedWildcardEventHandler(data: boolean) {
	logger.error(`>>> Entering sharedWildcardEventHandler(data=${data})`, { "event.action": "sharedWildcardEventHandler" });
    MqttController.IS_SHARED_WILDCARD_EVENT_RECEIVED = data;
	logger.warn(`<<< Exiting sharedWildcardEventHandler(data=${data})`, { "event.action": "sharedWildcardEventHandler" });
  }

  @MessagePattern('$share/test-group/shared-wildcard-message2/+/test')
  sharedWildcardMessageHandler2(data: number[]): number {
	logger.error(`>>> Entering sharedWildcardMessageHandler2(data=${data})`, { "event.action": "sharedWildcardMessageHandler2" });
	logger.warn(`<<< Exiting sharedWildcardMessageHandler2(data=${data})`, { "event.action": "sharedWildcardMessageHandler2" });
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('$share/test-group/shared-wildcard-event2/+/test')
  sharedWildcardEventHandler2(data: boolean) {
	logger.error(`>>> Entering sharedWildcardEventHandler2(data=${data})`, { "event.action": "sharedWildcardEventHandler2" });
    MqttController.IS_SHARED_WILDCARD2_EVENT_RECEIVED = data;
	logger.warn(`<<< Exiting sharedWildcardEventHandler2(data=${data})`, { "event.action": "sharedWildcardEventHandler2" });
  }
}
