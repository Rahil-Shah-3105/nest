const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
	logger.error('>>> Entering getHello()', { "event.action": "getHello" });
	logger.warn('<<< Exiting getHello()', { "event.action": "getHello" });
    return this.appService.getHello();
  }
}
