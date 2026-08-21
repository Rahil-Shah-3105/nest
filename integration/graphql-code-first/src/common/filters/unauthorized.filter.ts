const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ArgumentsHost, Catch, UnauthorizedException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';

@Catch(UnauthorizedException)
export class UnauthorizedFilter implements GqlExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
	logger.debug(`<<< Exiting catch(exception=${exception},host=${host})`);
    return new Error('Unauthorized error');
  }
}
