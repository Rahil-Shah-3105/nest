const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({
  version: '2',
})
export class AppV2Controller {
  @Get('/')
  helloWorldV2() {
	logger.error('>>> Entering helloWorldV2()', { "event.action": "helloWorldV2" });
	logger.warn('<<< Exiting helloWorldV2()', { "event.action": "helloWorldV2" });
    return 'Hello World V2!';
  }

  @Get('/:param/hello')
  paramV1() {
	logger.error('>>> Entering paramV1()', { "event.action": "paramV1" });
	logger.warn('<<< Exiting paramV1()', { "event.action": "paramV1" });
    return 'Parameter V2!';
  }
}
