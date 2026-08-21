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
	logger.debug('>>> Entering greetingTransient()');
    this.helloTransientService.greeting();
	logger.debug('<<< Exiting greetingTransient()');
  }

  @Get('request')
  greetingRequest() {
	logger.debug('>>> Entering greetingRequest()');
    this.helloRequestService.greeting();
    this.helloRequestService.farewell();
	logger.debug('<<< Exiting greetingRequest()');
  }
}
