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
	logger.error(`>>> Entering create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
	logger.warn(`<<< Exiting create(createUserDto=${createUserDto})`, { "event.action": "create", "logrite.createUserDto": createUserDto });
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
	logger.error(`>>> Entering update(id=${id},updateUserDto=${updateUserDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateUserDto": updateUserDto });
	logger.warn(`<<< Exiting update(id=${id},updateUserDto=${updateUserDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateUserDto": updateUserDto });
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return this.usersService.remove(+id);
  }
}
