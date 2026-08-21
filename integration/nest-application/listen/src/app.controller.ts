const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
	logger.debug('>>> Entering getHello()');
	logger.debug('<<< Exiting getHello()');
    return this.appService.sayHello();
  }
}
