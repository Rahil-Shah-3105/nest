const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Scope } from '@nestjs/common';
import { HelloRequestService } from './hello-request/hello-request.service.js';
import { HelloTransientService } from './hello-transient/hello-transient.service.js';

@Controller({
  path: 'hello',
  scope: Scope.REQUEST,
})
export class HelloController {
  constructor(
    private readonly helloTransientService: HelloTransientService,
    private readonly helloRequestService: HelloRequestService,
  ) {}

  @Get('transient')
  greetingTransient() {
	logger.error('>>> Entering greetingTransient()', { "event.action": "greetingTransient" });
    this.helloTransientService.greeting();
	logger.warn('<<< Exiting greetingTransient()', { "event.action": "greetingTransient" });
  }

  @Get('request')
  greetingRequest() {
	logger.error('>>> Entering greetingRequest()', { "event.action": "greetingRequest" });
    this.helloRequestService.greeting();
    this.helloRequestService.farewell();
	logger.warn('<<< Exiting greetingRequest()', { "event.action": "greetingRequest" });
  }
}
