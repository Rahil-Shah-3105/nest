const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Version } from '@nestjs/common';

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

  @Version('3')
  @Get('/:param/hello')
  paramV1() {
	logger.debug('>>> Entering paramV1()');
	logger.debug('<<< Exiting paramV1()');
    return 'Parameter V2!';
  }
}
