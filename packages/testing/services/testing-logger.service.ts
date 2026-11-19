const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ConsoleLogger } from '@nestjs/common';

/**
 * @publicApi
 */
export class TestingLogger extends ConsoleLogger {
  constructor() {
    super('Testing');
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  log(message: string) {}
  warn(message: string) {}
  debug(message: string) {}
  verbose(message: string) {}
  error(message: string, ...optionalParams: any[]) {
	logger.error(`>>> Entering error(message=${message},optionalParams=${optionalParams})`, { "event.action": "error", "logrite.message": message, "logrite.optionalParams": optionalParams });
	logger.warn(`<<< Exiting error(message=${message},optionalParams=${optionalParams})`, { "event.action": "error", "logrite.message": message, "logrite.optionalParams": optionalParams });
    return super.error(message, ...optionalParams);
  }
}
