const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    if (gqlContext) {
	logger.debug(`>>> Entering canActivate(context=${context})`);
      throw new UnauthorizedException();
    }
    return true;
  }
}
