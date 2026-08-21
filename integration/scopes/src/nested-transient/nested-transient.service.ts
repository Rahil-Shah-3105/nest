const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class NestedTransientService {
  static COUNTER = 0;
  public readonly instanceId: number;
  private context?: string;

  constructor() {
	logger.debug('>>> Entering constructor()');
    NestedTransientService.COUNTER++;
    this.instanceId = NestedTransientService.COUNTER;
	logger.debug(`constructor(): this.instanceId → ${this.instanceId}`);
  }

  setContext(ctx: string) {
	logger.debug(`>>> Entering setContext(ctx=${ctx})`);
    this.context = ctx;
	logger.debug(`setContext(ctx=${ctx}): this.context → ${this.context}`);
  }

  getContext(): string | undefined {
	logger.debug('>>> Entering getContext()');
	logger.debug('<<< Exiting getContext()');
    return this.context;
  }
}
