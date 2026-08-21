const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('slow')
  async slow() {
	logger.debug('>>> Entering slow()');
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
	logger.debug('<<< Exiting slow()');
    return 'ok';
  }
}
