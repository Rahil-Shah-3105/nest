const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Header, Param } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HelloService } from './hello.service.js';
import { UserByIdPipe } from './users/user-by-id.pipe.js';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(): string {
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
    return this.helloService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
	logger.error('>>> Entering asyncGreeting()', { "event.action": "asyncGreeting" });
	logger.warn('<<< Exiting asyncGreeting()', { "event.action": "asyncGreeting" });
    return this.helloService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
	logger.error('>>> Entering streamGreeting()', { "event.action": "streamGreeting" });
	logger.warn('<<< Exiting streamGreeting()', { "event.action": "streamGreeting" });
    return of(this.helloService.greeting());
  }

  @Get('local-pipe/:id')
  localPipe(
    @Param('id', UserByIdPipe)
    user: any,
  ): any {
    return user;
  }
}
