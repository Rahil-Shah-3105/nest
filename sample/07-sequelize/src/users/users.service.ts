const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './models/user.model.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  create(createUserDto: CreateUserDto): Promise<User> {
	logger.debug(`>>> Entering create(createUserDto=${createUserDto})`);
	logger.debug(`<<< Exiting create(createUserDto=${createUserDto})`);
    return this.userModel.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
    });
  }

  async findAll(): Promise<User[]> {
	logger.debug('>>> Entering findAll()');
    return this.userModel.findAll();
  }

  findOne(id: string): Promise<User | null> {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return this.userModel.findOne({
      where: {
        id,
      },
    });
  }

  async remove(id: string): Promise<void> {
	logger.debug(`>>> Entering remove(id=${id})`);
    const user = await this.findOne(id);
    await user?.destroy();
	logger.debug(`<<< Exiting remove(id=${id})`);
  }
}
