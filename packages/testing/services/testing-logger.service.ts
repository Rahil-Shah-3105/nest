const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ConsoleLogger } from '@nestjs/common';

/**
 * @publicApi
 */
export class TestingLogger extends ConsoleLogger {
  constructor() {
    super('Testing');
	logger.debug('>>> Entering constructor()');
	logger.debug('<<< Exiting constructor()');
  }

  log(message: string) {}
  warn(message: string) {}
  debug(message: string) {}
  verbose(message: string) {}
  error(message: string, ...optionalParams: any[]) {
	logger.debug(`>>> Entering error(message=${message},optionalParams=${optionalParams})`);
	logger.debug(`<<< Exiting error(message=${message},optionalParams=${optionalParams})`);
    return super.error(message, ...optionalParams);
  }
}
