const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('slow')
  async slow() {
	logger.error('>>> Entering slow()', { "event.action": "slow" });
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
	logger.warn('<<< Exiting slow()', { "event.action": "slow" });
    return 'ok';
  }
}
