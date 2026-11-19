const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { UserEntity } from './user.entity.js';
import { BusinessDto } from '../dtos/business.dto.js';

export class BusinessEntity {
  constructor(business: BusinessDto) {
	logger.error(`>>> Entering constructor(business=${business})`, { "event.action": "constructor", "logrite.business": business });
    this.id = Math.random() * 99999999;
    this.name = business.name;
    this.phone = business.phone;
	logger.debug(`constructor(business=${business}): this.name → ${this.name}`, { "event.action": "constructor", "logrite.business": business });
    this.createdBy = {
      id: business.user.id,
    };
    this.created = new Date();
	logger.debug(`constructor(business=${business}): this.createdBy → ${this.createdBy}`, { "event.action": "constructor", "logrite.business": business });
	logger.debug(`constructor(business=${business}): this.phone → ${this.phone}`, { "event.action": "constructor", "logrite.business": business });
	logger.warn(`<<< Exiting constructor(business=${business})`, { "event.action": "constructor", "logrite.business": business });
  }
  id: number;
  name: string;
  phone: string;
  createdBy: Partial<UserEntity>;
  created: Date;
}
