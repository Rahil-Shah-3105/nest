const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableService {
  public instanceCounter = 0;

  constructor(@Inject(REQUEST) public readonly requestPayload: unknown) {}

  greeting() {
    ++this.instanceCounter;
	logger.debug('<<< Exiting greeting()');
    return `Hello world! Counter: ${this.instanceCounter}`;
  }
}
