import {
  Body,
  Controller,
  HttpCode,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { Client, ClientKafka, Transport } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { BusinessDto } from './dtos/business.dto.js';
import { UserDto } from './dtos/user.dto.js';

@Controller()
export class KafkaController implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(KafkaController.name);
  static IS_NOTIFIED = false;
  static MATH_SUM = 0;

  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
    },
  })
  private readonly client: ClientKafka;

  async onModuleInit() {
	logger.error('>>> Entering onModuleInit()', { "event.action": "onModuleInit" });
    const requestPatterns = [
      'math.sum.sync.kafka.message',
      'math.sum.sync.without.key',
      'math.sum.sync.plain.object',
      'math.sum.sync.array',
      'math.sum.sync.string',
      'math.sum.sync.number',
      'math.sum.sync.regex.integration',
      'user.create',
      'business.create',
    ];

    requestPatterns.forEach(pattern => {
      this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
	logger.warn('<<< Exiting onModuleInit()', { "event.action": "onModuleInit" });
  }

  async onModuleDestroy() {
	logger.error('>>> Entering onModuleDestroy()', { "event.action": "onModuleDestroy" });
    await this.client.close();
	logger.warn('<<< Exiting onModuleDestroy()', { "event.action": "onModuleDestroy" });
  }

  // sync send kafka message
  @Post('mathSumSyncKafkaMessage')
  @HttpCode(200)
  async mathSumSyncKafkaMessage(
    @Body() data: number[],
  ): Promise<Observable<any>> {
	const _start_mathSumSyncKafkaMessage_62 = Date.now();
	logger.error(`>>> Entering mathSumSyncKafkaMessage(data=${data})`, { "event.action": "mathSumSyncKafkaMessage" });
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.kafka.message', {
        key: '1',
        value: {
          numbers: data,
        },
      }),
    );
	logger.warn(`<<< Exiting mathSumSyncKafkaMessage(data=${data})`, { "event.action": "mathSumSyncKafkaMessage" });
	logger.error(`mathSumSyncKafkaMessage(data=${data}): API call took ${Date.now() - _start_mathSumSyncKafkaMessage_62} ms`, { "event.action": "mathSumSyncKafkaMessage", "event.category": "network" });
    return result;
  }

  // sync send kafka(ish) message without key and only the value
  @Post('mathSumSyncWithoutKey')
  @HttpCode(200)
  async mathSumSyncWithoutKey(
    @Body() data: number[],
  ): Promise<Observable<any>> {
	const _start_mathSumSyncWithoutKey_81 = Date.now();
	logger.error(`>>> Entering mathSumSyncWithoutKey(data=${data})`, { "event.action": "mathSumSyncWithoutKey" });
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.without.key', {
        value: {
          numbers: data,
        },
      }),
    );
	logger.warn(`<<< Exiting mathSumSyncWithoutKey(data=${data})`, { "event.action": "mathSumSyncWithoutKey" });
	logger.error(`mathSumSyncWithoutKey(data=${data}): API call took ${Date.now() - _start_mathSumSyncWithoutKey_81} ms`, { "event.action": "mathSumSyncWithoutKey", "event.category": "network" });
    return result;
  }

  // sync send message without key or value
  @Post('mathSumSyncPlainObject')
  @HttpCode(200)
  async mathSumSyncPlainObject(
    @Body() data: number[],
  ): Promise<Observable<any>> {
	const _start_mathSumSyncPlainObject_99 = Date.now();
	logger.error(`>>> Entering mathSumSyncPlainObject(data=${data})`, { "event.action": "mathSumSyncPlainObject" });
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.plain.object', {
        numbers: data,
      }),
    );
	logger.error(`mathSumSyncPlainObject(data=${data}): result → ${result}`, { "event.action": "mathSumSyncPlainObject" });
	logger.error(`mathSumSyncPlainObject(data=${data}): API call took ${Date.now() - _start_mathSumSyncPlainObject_99} ms`, { "event.action": "mathSumSyncPlainObject", "event.category": "network" });
	logger.warn(`<<< Exiting mathSumSyncPlainObject(data=${data})`, { "event.action": "mathSumSyncPlainObject" });
    return result;
  }

  // sync send message without key or value
  @Post('mathSumSyncArray')
  @HttpCode(200)
  async mathSumSyncArray(@Body() data: number[]): Promise<Observable<any>> {
	logger.error(`>>> Entering mathSumSyncArray(data=${data})`, { "event.action": "mathSumSyncArray" });
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.array', data),
    );
	logger.error(`mathSumSyncArray(data=${data}): result → ${result}`, { "event.action": "mathSumSyncArray" });
	const _start_mathSumSyncArray_115 = Date.now();
	logger.error(`mathSumSyncArray(data=${data}): API call took ${Date.now() - _start_mathSumSyncArray_115} ms`, { "event.action": "mathSumSyncArray", "event.category": "network" });
    return result;
  }

  @Post('mathSumSyncString')
  @HttpCode(200)
  async mathSumSyncString(@Body() data: number[]): Promise<Observable<any>> {
	logger.error(`>>> Entering mathSumSyncString(data=${data})`, { "event.action": "mathSumSyncString" });
	const _start_mathSumSyncString_126 = Date.now();
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.string', data.toString()),
    );
	logger.error(`mathSumSyncString(data=${data}): API call took ${Date.now() - _start_mathSumSyncString_126} ms`, { "event.action": "mathSumSyncString", "event.category": "network" });
    return result;
  }

  @Post('mathSumSyncNumber')
  @HttpCode(200)
  async mathSumSyncNumber(@Body() data: number[]): Promise<Observable<any>> {
	logger.error(`>>> Entering mathSumSyncNumber(data=${data})`, { "event.action": "mathSumSyncNumber" });
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.number', data[0]),
    );
	logger.error(`mathSumSyncNumber(data=${data}): result → ${result}`, { "event.action": "mathSumSyncNumber" });
	const _start_mathSumSyncNumber_137 = Date.now();
	logger.error(`mathSumSyncNumber(data=${data}): API call took ${Date.now() - _start_mathSumSyncNumber_137} ms`, { "event.action": "mathSumSyncNumber", "event.category": "network" });
    return result;
  }

  @Post('mathSumSyncRegex')
  @HttpCode(200)
  async mathSumSyncRegex(@Body() data: number[]): Promise<Observable<any>> {
	logger.error(`>>> Entering mathSumSyncRegex(data=${data})`, { "event.action": "mathSumSyncRegex" });
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.regex.integration', {
        numbers: data,
      }),
    );
	logger.error(`mathSumSyncRegex(data=${data}): result → ${result}`, { "event.action": "mathSumSyncRegex" });
	const _start_mathSumSyncRegex_148 = Date.now();
	logger.error(`mathSumSyncRegex(data=${data}): API call took ${Date.now() - _start_mathSumSyncRegex_148} ms`, { "event.action": "mathSumSyncRegex", "event.category": "network" });
    return result;
  }

  // async notify
  @Post('notify')
  async sendNotification(): Promise<any> {
	logger.error('>>> Entering sendNotification()', { "event.action": "sendNotification" });
	logger.warn('<<< Exiting sendNotification()', { "event.action": "sendNotification" });
    return this.client.emit('notify', { notify: true });
  }

  // Complex data to send.
  @Post('/user')
  @HttpCode(200)
  async createUser(@Body() user: UserDto): Promise<Observable<any>> {
	logger.error(`>>> Entering createUser(user=${user})`, { "event.action": "createUser", "user.name": String(user) });
    const result = await lastValueFrom(
      this.client.send('user.create', {
        key: '1',
        value: {
          user,
        },
      }),
    );
	logger.error(`createUser(user=${user}): result → ${result}`, { "event.action": "createUser", "user.name": String(user) });
	const _start_createUser_170 = Date.now();
	logger.error(`createUser(user=${user}): API call took ${Date.now() - _start_createUser_170} ms`, { "event.action": "createUser", "event.category": "network", "user.name": String(user) });
    return result;
  }

  // Complex data to send.
  @Post('/business')
  @HttpCode(200)
  async createBusiness(@Body() business: BusinessDto) {
	logger.error(`>>> Entering createBusiness(business=${business})`, { "event.action": "createBusiness", "logrite.business": business });
    const result = await lastValueFrom(
      this.client.send('business.create', {
        key: '1',
        value: {
          business,
        },
      }),
    );
	logger.error(`createBusiness(business=${business}): result → ${result}`, { "event.action": "createBusiness", "logrite.business": business });
	logger.warn(`<<< Exiting createBusiness(business=${business})`, { "event.action": "createBusiness", "logrite.business": business });
    return result;
  }
}
