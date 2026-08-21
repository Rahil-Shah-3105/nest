const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Guard } from './guards/request-scoped.guard.js';
import { HelloService } from './hello.service.js';
import { Interceptor } from './interceptors/logging.interceptor.js';
import { UserByIdPipe } from './users/user-by-id.pipe.js';
import { UsersService } from './users/users.service.js';

@Controller('hello')
export class HelloController {
  static COUNTER = 0;
  constructor(
    private readonly helloService: HelloService,
    private readonly usersService: UsersService,
  ) {
    HelloController.COUNTER++;
  }

  @UseGuards(Guard)
  @UseInterceptors(Interceptor)
  @Get()
  greeting(@Param('id', UserByIdPipe) id): string {
	logger.debug(`>>> Entering greeting(id=${id})`);
	logger.debug(`<<< Exiting greeting(id=${id})`);
    return this.helloService.greeting();
  }
}
