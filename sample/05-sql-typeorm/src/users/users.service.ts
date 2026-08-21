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
	logger.debug(`>>> Entering create(createUserDto=${createUserDto})`);
    const user = new User();
	logger.debug(`create(createUserDto=${createUserDto}): user → ${user}`);
    user.firstName = createUserDto.firstName;
    user.lastName = createUserDto.lastName;
	logger.debug(`create(createUserDto=${createUserDto}): user.firstName → ${user.firstName}`);

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
	logger.debug('>>> Entering findAll()');
    return this.usersRepository.find();
  }

  findOne(id: number): Promise<User | null> {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.usersRepository.findOneBy({ id: id });
  }

  async remove(id: string): Promise<void> {
	logger.debug(`>>> Entering remove(id=${id})`);
    await this.usersRepository.delete(id);
	logger.debug(`<<< Exiting remove(id=${id})`);
  }
}
