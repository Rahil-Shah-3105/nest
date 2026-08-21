const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { ConfigService } from './config/config.service.js';

@Injectable()
export class AppService {
  private helloMessage: string;

  constructor(configService: ConfigService) {
	logger.debug(`>>> Entering constructor(configService=${configService})`);
    this.helloMessage = configService.get('HELLO_MESSAGE');
	logger.debug(`<<< Exiting constructor(configService=${configService})`);
  }

  getHello(): string {
	logger.debug('>>> Entering getHello()');
	logger.debug('<<< Exiting getHello()');
    return this.helloMessage;
  }
}
