const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Inject,
  Injectable,
  PreconditionFailedException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy.js';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableService {
  public instanceCounter = 0;

  constructor(@Inject(REQUEST) private readonly requestPayload: TenantContext) {
	logger.debug(`>>> Entering constructor(requestPayload=${requestPayload})`);
    if (requestPayload.forceError) {
	logger.debug(`<<< Exiting constructor(requestPayload=${requestPayload})`);
      throw new PreconditionFailedException('Forced error');
    }
  }

  greeting() {
    ++this.instanceCounter;
	logger.debug('<<< Exiting greeting()');
    return `Hello world! Counter: ${this.instanceCounter}`;
  }

  getTenantId() {
	logger.debug('>>> Entering getTenantId()');
	logger.debug('<<< Exiting getTenantId()');
    return this.requestPayload.tenantId;
  }
}
