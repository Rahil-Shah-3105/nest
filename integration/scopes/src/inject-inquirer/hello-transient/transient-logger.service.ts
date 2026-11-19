const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientLogger {
  @Inject(INQUIRER) inquirer: any = null;
  config: object;

  constructor(
    @Inject(INQUIRER) private readonly inquirerInCtor,
    private readonly logger: Logger,
  ) {
	logger.error(`>>> Entering constructor(inquirerInCtor=${inquirerInCtor},logger=${logger})`, { "event.action": "constructor", "logrite.inquirerInCtor": inquirerInCtor, "logrite.logger": logger });
    this.config =
	logger.warn(`<<< Exiting constructor(inquirerInCtor=${inquirerInCtor},logger=${logger})`, { "event.action": "constructor", "logrite.inquirerInCtor": inquirerInCtor, "logrite.logger": logger });
      (inquirerInCtor.constructor && inquirerInCtor.constructor.logger) || {};
  }

  log(message: string) {
	logger.error(`>>> Entering log(message=${message})`, { "event.action": "log", "logrite.message": message });
    this.logger.log({ message, ...this.config });
	logger.warn(`<<< Exiting log(message=${message})`, { "event.action": "log", "logrite.message": message });
  }
}
