const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({
  version: '2',
})
export class AppV2Controller {
  @Get('/')
  helloWorldV2() {
	logger.debug('>>> Entering helloWorldV2()');
	logger.debug('<<< Exiting helloWorldV2()');
    return 'Hello World V2!';
  }

  @Get('/:param/hello')
  paramV1() {
	logger.debug('>>> Entering paramV1()');
	logger.debug('<<< Exiting paramV1()');
    return 'Parameter V2!';
  }
}
