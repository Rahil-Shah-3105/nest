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
	logger.error(`>>> Entering create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
	logger.warn(`<<< Exiting create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
    return this.userModel.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
    });
  }

  async findAll(): Promise<User[]> {
	const startTime: number = Date.now();
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
    return this.userModel.findAll();
  }

  findOne(id: string): Promise<User | null> {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.userModel.findOne({
      where: {
        id,
      },
    });
  }

  async remove(id: string): Promise<void> {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    const user = await this.findOne(id);
    await user?.destroy();
	logger.error(`remove(id=${id}): user → ${user}`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
  }
}
