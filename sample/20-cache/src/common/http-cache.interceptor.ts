const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
	logger.error(`>>> Entering trackBy(context=${context})`, { "event.action": "trackBy" });
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;
	logger.error(`trackBy(context=${context}): request → ${request}`, { "event.action": "trackBy" });

    const isGetRequest = httpAdapter.getRequestMethod(request) === 'GET';
	logger.error(`trackBy(context=${context}): isGetRequest → ${isGetRequest}`, { "event.action": "trackBy" });
    const excludePaths: string[] = [
      // Routes to be excluded
    ];
    if (
      !isGetRequest ||
      (isGetRequest &&
        excludePaths.includes(httpAdapter.getRequestUrl(request)))
    ) {
	logger.warn(`<<< Exiting trackBy(context=${context})`, { "event.action": "trackBy" });
      return undefined;
    }
    return httpAdapter.getRequestUrl(request);
  }
}
