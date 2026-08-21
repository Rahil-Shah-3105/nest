const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Controller()
export class HttpController {
  @Get('hello')
  testMsvc() {
	logger.debug('>>> Entering testMsvc()');
    const client = ClientProxyFactory.create({
      transport: Transport.TCP,
    });
	logger.debug('<<< Exiting testMsvc()');
    return client.send('test', { test: true });
  }
}
