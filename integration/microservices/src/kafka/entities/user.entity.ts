const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { UserDto } from '../dtos/user.dto.js';

export class UserEntity {
  constructor(user: UserDto) {
	logger.debug(`>>> Entering constructor(user=${user})`);
    this.id = Math.random() * 99999999;
    this.name = user.name;
    this.email = user.email;
    this.phone = user.phone;
    this.years = user.years;
    this.created = new Date();
  }
  id: number;
  name: string;
  email: string;
  phone: string;
  years: number;
  created: Date;
}
