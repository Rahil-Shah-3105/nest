const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Guard } from './guards/request-scoped.guard.js';
import { HelloService } from './hello.service.js';
import { Interceptor } from './interceptors/logging.interceptor.js';
import { UsersService } from './users/users.service.js';

@Controller()
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
  @MessagePattern('test')
  greeting(): string {
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
    return this.helloService.greeting();
  }
}
