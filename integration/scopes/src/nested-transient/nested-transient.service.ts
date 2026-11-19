const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class NestedTransientService {
  static COUNTER = 0;
  public readonly instanceId: number;
  private context?: string;

  constructor() {
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
    NestedTransientService.COUNTER++;
    this.instanceId = NestedTransientService.COUNTER;
	logger.debug(`constructor(): this.instanceId → ${this.instanceId}`, { "event.action": "constructor" });
  }

  setContext(ctx: string) {
	logger.error(`>>> Entering setContext(ctx=${ctx})`, { "event.action": "setContext" });
    this.context = ctx;
	logger.debug(`setContext(ctx=${ctx}): this.context → ${this.context}`, { "event.action": "setContext" });
  }

  getContext(): string | undefined {
	logger.error('>>> Entering getContext()', { "event.action": "getContext" });
	logger.warn('<<< Exiting getContext()', { "event.action": "getContext" });
    return this.context;
  }
}
