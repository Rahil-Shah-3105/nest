const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<User> {
	logger.error(`>>> Entering create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
    const user = new User();
	logger.debug(`create(createUserDto=${createUserDto}): user.lastName → ${user.lastName}`, { "event.action": "create", "logrite.createUserDto": createUserDto });
    user.firstName = createUserDto.firstName;
	logger.error(`create(createUserDto=${createUserDto}): user → ${user}`, { "event.action": "create", "logrite.createUserDto": createUserDto });
	logger.debug(`create(createUserDto=${createUserDto}): user.firstName → ${user.firstName}`, { "event.action": "create", "logrite.createUserDto": createUserDto });
    user.lastName = createUserDto.lastName;
	const startTime: number = Date.now();

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
    return this.usersRepository.find();
  }

  findOne(id: number): Promise<User | null> {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.usersRepository.findOneBy({ id: id });
  }

  async remove(id: string): Promise<void> {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    await this.usersRepository.delete(id);
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
  }
}
