const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
	logger.debug(`>>> Entering create(createUserDto=${createUserDto})`);
	logger.debug(`<<< Exiting create(createUserDto=${createUserDto})`);
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
	logger.debug('>>> Entering findAll()');
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
	logger.debug(`>>> Entering update(id=${id},updateUserDto=${updateUserDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateUserDto=${updateUserDto})`);
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return this.usersService.remove(+id);
  }
}
