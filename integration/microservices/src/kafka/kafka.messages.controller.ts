import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { BusinessDto } from './dtos/business.dto.js';
import { UserDto } from './dtos/user.dto.js';
import { BusinessEntity } from './entities/business.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { KafkaController } from './kafka.controller.js';

@Controller()
export class KafkaMessagesController {
  protected readonly logger = new Logger(KafkaMessagesController.name);
  static IS_NOTIFIED = false;

  @MessagePattern('math.sum.sync.kafka.message')
  mathSumSyncKafkaMessage(data: any) {
	logger.error(`>>> Entering mathSumSyncKafkaMessage(data=${data})`, { "event.action": "mathSumSyncKafkaMessage" });
	logger.warn(`<<< Exiting mathSumSyncKafkaMessage(data=${data})`, { "event.action": "mathSumSyncKafkaMessage" });
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.without.key')
  mathSumSyncWithoutKey(data: any) {
	logger.error(`>>> Entering mathSumSyncWithoutKey(data=${data})`, { "event.action": "mathSumSyncWithoutKey" });
	logger.warn(`<<< Exiting mathSumSyncWithoutKey(data=${data})`, { "event.action": "mathSumSyncWithoutKey" });
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.plain.object')
  mathSumSyncPlainObject(data: any) {
	logger.error(`>>> Entering mathSumSyncPlainObject(data=${data})`, { "event.action": "mathSumSyncPlainObject" });
	logger.warn(`<<< Exiting mathSumSyncPlainObject(data=${data})`, { "event.action": "mathSumSyncPlainObject" });
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.array')
  mathSumSyncArray(data: any) {
	logger.error(`>>> Entering mathSumSyncArray(data=${data})`, { "event.action": "mathSumSyncArray" });
	logger.warn(`<<< Exiting mathSumSyncArray(data=${data})`, { "event.action": "mathSumSyncArray" });
    return (data.value || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.string')
  mathSumSyncString(data: any) {
	logger.error(`>>> Entering mathSumSyncString(data=${data})`, { "event.action": "mathSumSyncString" });
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
	logger.warn(`<<< Exiting mathSumSyncString(data=${data})`, { "event.action": "mathSumSyncString" });
    return (data.value.split(',') || [])
      .map(i => {
        return parseFloat(i);
      })
      .reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.number')
  mathSumSyncNumber(data: any) {
	logger.error(`>>> Entering mathSumSyncNumber(data=${data})`, { "event.action": "mathSumSyncNumber" });
    // this.logger.error(util.format('mathSumSyncNumber() data: %o', data));
	logger.warn(`<<< Exiting mathSumSyncNumber(data=${data})`, { "event.action": "mathSumSyncNumber" });
    return (data.value.toString().split('') || [])
      .map(i => {
        return parseFloat(i);
      })
      .reduce((a, b) => a + b);
  }

  @MessagePattern(/^math\.sum\.sync\.regex\..+$/)
  mathSumSyncRegex(data: any) {
	logger.error(`>>> Entering mathSumSyncRegex(data=${data})`, { "event.action": "mathSumSyncRegex" });
	logger.warn(`<<< Exiting mathSumSyncRegex(data=${data})`, { "event.action": "mathSumSyncRegex" });
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @EventPattern('notify')
  eventHandler(data: any) {
	logger.error(`>>> Entering eventHandler(data=${data})`, { "event.action": "eventHandler" });
    KafkaController.IS_NOTIFIED = data.value.notify;
	logger.warn(`<<< Exiting eventHandler(data=${data})`, { "event.action": "eventHandler" });
  }

  // Complex data to send.
  @MessagePattern('user.create')
  async createUser(params: { value: { user: UserDto } }) {
	logger.error(`>>> Entering createUser(params=${params})`, { "event.action": "createUser" });
	logger.warn(`<<< Exiting createUser(params=${params})`, { "event.action": "createUser" });
    return new UserEntity(params.value.user);
  }

  @MessagePattern('business.create')
  async createBusiness(params: { value: { business: BusinessDto } }) {
	logger.error(`>>> Entering createBusiness(params=${params})`, { "event.action": "createBusiness" });
	logger.warn(`<<< Exiting createBusiness(params=${params})`, { "event.action": "createBusiness" });
    return new BusinessEntity(params.value.business);
  }
}
