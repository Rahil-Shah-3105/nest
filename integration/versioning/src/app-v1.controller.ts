const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({
  version: '1',
})
export class AppV1Controller {
  @Get('/')
  helloWorldV1() {
	logger.debug('>>> Entering helloWorldV1()');
	logger.debug('<<< Exiting helloWorldV1()');
    return 'Hello World V1!';
  }

  @Get('/:param/hello')
  paramV1() {
	logger.debug('>>> Entering paramV1()');
	logger.debug('<<< Exiting paramV1()');
    return 'Parameter V1!';
  }
}
