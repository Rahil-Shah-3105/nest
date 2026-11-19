const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { UserDto } from '../dtos/user.dto.js';

export class UserEntity {
  constructor(user: UserDto) {
	logger.error(`>>> Entering constructor(user=${user})`, { "event.action": "constructor", "user.name": String(user) });
    this.id = Math.random() * 99999999;
    this.name = user.name;
    this.email = user.email;
	logger.debug(`constructor(user=${user}): this.name → ${this.name}`, { "event.action": "constructor", "user.name": String(user) });
	logger.debug(`constructor(user=${user}): this.email → ${this.email}`, { "event.action": "constructor", "user.name": String(user) });
    this.phone = user.phone;
    this.years = user.years;
	logger.debug(`constructor(user=${user}): this.phone → ${this.phone}`, { "event.action": "constructor", "user.name": String(user) });
	logger.debug(`constructor(user=${user}): this.years → ${this.years}`, { "event.action": "constructor", "user.name": String(user) });
    this.created = new Date();
  }
  id: number;
  name: string;
  email: string;
  phone: string;
  years: number;
  created: Date;
}
