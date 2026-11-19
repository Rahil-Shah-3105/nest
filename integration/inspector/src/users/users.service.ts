const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  create(createUserDto: CreateUserDto) {
	logger.error(`>>> Entering create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
	logger.warn(`<<< Exiting create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
    return 'This action adds a new user';
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return `This action returns all users`;
  }

  findOne(id: number) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
	logger.error(`>>> Entering update(id=${id},updateUserDto=${updateUserDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateUserDto": updateUserDto });
	logger.warn(`<<< Exiting update(id=${id},updateUserDto=${updateUserDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateUserDto": updateUserDto });
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return `This action removes a #${id} user`;
  }
}
