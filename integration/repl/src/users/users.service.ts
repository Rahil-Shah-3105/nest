const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
  ) {}

  create(createUserDto: CreateUserDto) {
	logger.debug(`>>> Entering create(createUserDto=${createUserDto})`);
	logger.debug(`<<< Exiting create(createUserDto=${createUserDto})`);
    return 'This action adds a new user';
  }

  findAll() {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return `This action returns all users`;
  }

  findOne(id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
	logger.debug(`>>> Entering update(id=${id},updateUserDto=${updateUserDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateUserDto=${updateUserDto})`);
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return `This action removes a #${id} user`;
  }
}
