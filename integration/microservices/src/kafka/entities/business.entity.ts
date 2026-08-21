const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { UserEntity } from './user.entity.js';
import { BusinessDto } from '../dtos/business.dto.js';

export class BusinessEntity {
  constructor(business: BusinessDto) {
	logger.debug(`>>> Entering constructor(business=${business})`);
    this.id = Math.random() * 99999999;
    this.name = business.name;
    this.phone = business.phone;
    this.createdBy = {
      id: business.user.id,
    };
    this.created = new Date();
	logger.debug(`constructor(business=${business}): this.name → ${this.name}`);
  }
  id: number;
  name: string;
  phone: string;
  createdBy: Partial<UserEntity>;
  created: Date;
}
