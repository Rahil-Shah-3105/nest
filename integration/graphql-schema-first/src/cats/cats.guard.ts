const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class CatsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
	logger.debug(`>>> Entering canActivate(context=${context})`);
    const ctx = GqlExecutionContext.create(context);
	logger.debug(`canActivate(context=${context}): ctx → ${ctx}`);
	logger.debug(`<<< Exiting canActivate(context=${context})`);
    return true;
  }
}
