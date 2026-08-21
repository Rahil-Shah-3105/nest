const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
	logger.debug(`>>> Entering create(createUserDto=${createUserDto})`);
	logger.debug(`<<< Exiting create(createUserDto=${createUserDto})`);
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(): Promise<User[]> {
	logger.debug('>>> Entering findAll()');
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return this.usersService.remove(id);
  }
}
