const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
	logger.debug(`trackBy(context=${context}): request → ${request}`);
    const { httpAdapter } = this.httpAdapterHost;

    const isGetRequest = httpAdapter.getRequestMethod(request) === 'GET';
	logger.debug(`trackBy(context=${context}): isGetRequest → ${isGetRequest}`);
    const excludePaths: string[] = [
      // Routes to be excluded
    ];
    if (
      !isGetRequest ||
      (isGetRequest &&
        excludePaths.includes(httpAdapter.getRequestUrl(request)))
    ) {
	logger.debug(`>>> Entering trackBy(context=${context})`);
	logger.debug(`<<< Exiting trackBy(context=${context})`);
      return undefined;
    }
    return httpAdapter.getRequestUrl(request);
  }
}
