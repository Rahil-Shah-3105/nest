const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';

@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get()
  async findAll() {
	logger.debug('>>> Entering findAll()');
    // For demonstration purposes, we will simulate a delay
    // to show that the cache is working as expected.
    await new Promise(resolve => setTimeout(resolve, 3000));
	logger.debug('<<< Exiting findAll()');
    return [{ id: 1, name: 'Nest' }];
  }
}
