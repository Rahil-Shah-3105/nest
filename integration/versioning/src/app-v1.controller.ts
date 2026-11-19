const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller({
  version: '1',
})
export class AppV1Controller {
  @Get('/')
  helloWorldV1() {
	logger.error('>>> Entering helloWorldV1()', { "event.action": "helloWorldV1" });
	logger.warn('<<< Exiting helloWorldV1()', { "event.action": "helloWorldV1" });
    return 'Hello World V1!';
  }

  @Get('/:param/hello')
  paramV1() {
	logger.error('>>> Entering paramV1()', { "event.action": "paramV1" });
	logger.warn('<<< Exiting paramV1()', { "event.action": "paramV1" });
    return 'Parameter V1!';
  }
}
