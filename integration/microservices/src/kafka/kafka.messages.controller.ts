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
	logger.debug(`>>> Entering mathSumSyncKafkaMessage(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncKafkaMessage(data=${data})`);
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.without.key')
  mathSumSyncWithoutKey(data: any) {
	logger.debug(`>>> Entering mathSumSyncWithoutKey(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncWithoutKey(data=${data})`);
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.plain.object')
  mathSumSyncPlainObject(data: any) {
	logger.debug(`>>> Entering mathSumSyncPlainObject(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncPlainObject(data=${data})`);
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.array')
  mathSumSyncArray(data: any) {
	logger.debug(`>>> Entering mathSumSyncArray(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncArray(data=${data})`);
    return (data.value || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.string')
  mathSumSyncString(data: any) {
	logger.debug(`>>> Entering mathSumSyncString(data=${data})`);
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
	logger.debug(`<<< Exiting mathSumSyncString(data=${data})`);
    return (data.value.split(',') || [])
      .map(i => {
        return parseFloat(i);
      })
      .reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.number')
  mathSumSyncNumber(data: any) {
	logger.debug(`>>> Entering mathSumSyncNumber(data=${data})`);
    // this.logger.error(util.format('mathSumSyncNumber() data: %o', data));
	logger.debug(`<<< Exiting mathSumSyncNumber(data=${data})`);
    return (data.value.toString().split('') || [])
      .map(i => {
        return parseFloat(i);
      })
      .reduce((a, b) => a + b);
  }

  @MessagePattern(/^math\.sum\.sync\.regex\..+$/)
  mathSumSyncRegex(data: any) {
	logger.debug(`>>> Entering mathSumSyncRegex(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncRegex(data=${data})`);
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @EventPattern('notify')
  eventHandler(data: any) {
	logger.debug(`>>> Entering eventHandler(data=${data})`);
    KafkaController.IS_NOTIFIED = data.value.notify;
	logger.debug(`eventHandler(data=${data}): KafkaController.IS_NOTIFIED → ${KafkaController.IS_NOTIFIED}`);
  }

  // Complex data to send.
  @MessagePattern('user.create')
  async createUser(params: { value: { user: UserDto } }) {
	logger.debug(`>>> Entering createUser(params=${params})`);
	logger.debug(`<<< Exiting createUser(params=${params})`);
    return new UserEntity(params.value.user);
  }

  @MessagePattern('business.create')
  async createBusiness(params: { value: { business: BusinessDto } }) {
	logger.debug(`>>> Entering createBusiness(params=${params})`);
	logger.debug(`<<< Exiting createBusiness(params=${params})`);
    return new BusinessEntity(params.value.business);
  }
}
