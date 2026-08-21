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
	logger.debug('>>> Entering greeting()');
	logger.debug('<<< Exiting greeting()');
    return this.helloService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
	logger.debug('>>> Entering asyncGreeting()');
	logger.debug('<<< Exiting asyncGreeting()');
    return this.helloService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
	logger.debug('>>> Entering streamGreeting()');
	logger.debug('<<< Exiting streamGreeting()');
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
