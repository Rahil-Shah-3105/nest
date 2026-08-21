const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy.js';

@Injectable()
export class NonDurableService {
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext,
  ) {}

  getTenantId() {
	logger.debug('>>> Entering getTenantId()');
	logger.debug('<<< Exiting getTenantId()');
    return this.requestPayload.tenantId;
  }
}
