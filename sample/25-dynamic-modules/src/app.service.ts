const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { ConfigService } from './config/config.service.js';

@Injectable()
export class AppService {
  private helloMessage: string;

  constructor(configService: ConfigService) {
	logger.error(`>>> Entering constructor(configService=${configService})`, { "event.action": "constructor", "logrite.configService": configService });
    this.helloMessage = configService.get('HELLO_MESSAGE');
	logger.warn(`<<< Exiting constructor(configService=${configService})`, { "event.action": "constructor", "logrite.configService": configService });
  }

  getHello(): string {
	logger.error('>>> Entering getHello()', { "event.action": "getHello" });
	logger.warn('<<< Exiting getHello()', { "event.action": "getHello" });
    return this.helloMessage;
  }
}
