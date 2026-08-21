const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Body,
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  MessageEvent,
  NestInterceptor,
  Post,
  Query,
  Req,
  RequestMethod,
  Sse,
  SseSignal,
  UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { IncomingMessage } from 'node:http';
import { EMPTY, interval, map, Observable, of } from 'rxjs';

class SseQueryDto {
  @Type(() => Number)
  @IsInt()
  limit!: number;
}

@Injectable()
class PassthroughInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
	logger.debug(`>>> Entering intercept(_context=${_context},next=${next})`);
	logger.debug(`<<< Exiting intercept(_context=${_context},next=${next})`);
    return next.handle();
  }
}

@Controller()
export class AppController {
  private promiseDelayedRequestsStarted = 0;
  private promiseDelayedSubscriptionsStarted = 0;
  private promiseDelayedCloseEventsObserved = 0;
  private promiseDelayedTeardownsObserved = 0;
  private promiseDelayedRunningStreams = 0;
  private readonly promiseDelayedResolvers: Array<() => void> = [];

  private interceptorDelayedRequestsStarted = 0;
  private interceptorDelayedSubscriptionsStarted = 0;
  private interceptorDelayedCloseEventsObserved = 0;
  private interceptorDelayedTeardownsObserved = 0;
  private interceptorDelayedRunningStreams = 0;
  private readonly interceptorDelayedResolvers: Array<() => void> = [];

  private signalRequestsStarted = 0;
  private signalResourcesAllocated = 0;
  private signalResourcesCleaned = 0;
  private signalSubscriptionsStarted = 0;

  private completingSubscriptionsStarted = 0;
  private completingAbortsObserved = 0;
  private completingTeardownsObserved = 0;

  private streamingSubscriptionsStarted = 0;
  private streamingAbortsObserved = 0;
  private streamingTeardownsObserved = 0;

  @Sse('sse')
  sse(): Observable<MessageEvent> {
	logger.debug('>>> Entering sse()');
	logger.debug('<<< Exiting sse()');
    return interval(1000).pipe(
      map(() => ({ data: { hello: 'world' } }) as MessageEvent),
    );
  }

  @Sse('sse/validated')
  sseWithValidatedQuery(@Query() query: SseQueryDto): Observable<MessageEvent> {
	logger.debug(`>>> Entering sseWithValidatedQuery(query=${query})`);
	logger.debug(`<<< Exiting sseWithValidatedQuery(query=${query})`);
    return of({ data: { limit: query.limit } });
  }

  @Sse('sse/burst')
  sseBurst(
    @Query('n') n = '20',
    @Query('size') size = '65536',
  ): Observable<MessageEvent> {
    const count = parseInt(n, 10);
	logger.debug(`sseBurst(n=${n},size=${size}): count → ${count}`);
    const payload = 'X'.repeat(parseInt(size, 10));
	logger.debug(`sseBurst(n=${n},size=${size}): payload → ${payload}`);

    return new Observable(subscriber => {
      for (let i = 0; i < count; i++) {
        subscriber.next({ data: payload });
      }
      subscriber.complete();
    });
  }

  @Sse('sse/post', { method: RequestMethod.POST })
  ssePost(@Body() body: { content?: string }): Observable<MessageEvent> {
	logger.debug(`>>> Entering ssePost(body=${body})`);
	logger.debug(`<<< Exiting ssePost(body=${body})`);
    return of({ data: { content: body.content ?? 'default' } });
  }

  @Sse('sse/promise-delayed')
  ssePromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    return this.createPromiseDelayedSse(request);
  }

  @Sse('sse/post/promise-delayed', { method: RequestMethod.POST })
  ssePostPromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
    @Body() _body: { content?: string },
  ): Promise<Observable<MessageEvent>> {
    return this.createPromiseDelayedSse(request);
  }

  private createPromiseDelayedSse(
    request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    this.promiseDelayedRequestsStarted += 1;
    this.promiseDelayedRunningStreams += 1;
    const rawRequest = request.socket ?? request;

    let subscribed = false;
	logger.debug(`createPromiseDelayedSse(request=${request}): subscribed → ${subscribed}`);
    let released = false;
	logger.debug(`createPromiseDelayedSse(request=${request}): released → ${released}`);
    const releaseStream = () => {
	logger.debug(`>>> Entering createPromiseDelayedSse(request=${request})`);
      if (released) {
        return;
      }
	logger.debug('>>> Entering releaseStream()');
      released = true;
      this.promiseDelayedRunningStreams -= 1;
	logger.debug(`releaseStream(): released → ${released}`);
	logger.debug('<<< Exiting releaseStream()');
    };

    rawRequest.once('close', () => {
      this.promiseDelayedCloseEventsObserved += 1;

      // When the client disconnects before the promise resolves, the producer
      // Observable is never subscribed, so its teardown never runs. Release the
      // stream slot here instead — otherwise it would leak in the stats.
      if (!subscribed) {
        releaseStream();
      }
    });

    return new Promise(resolve => {
      this.promiseDelayedResolvers.push(() =>
        resolve(
          new Observable<MessageEvent>(subscriber => {
            subscribed = true;
            this.promiseDelayedSubscriptionsStarted += 1;

            const intervalId = setInterval(() => {
              subscriber.next({ data: { hello: 'world' } });
            }, 50);

            return () => {
              clearInterval(intervalId);
              this.promiseDelayedTeardownsObserved += 1;
              releaseStream();
			logger.debug(`<<< Exiting createPromiseDelayedSse(request=${request})`);
            };
          }),
        ),
      );
    });
  }

  @Post('sse/promise-delayed/release')
  releaseSsePromiseDelayed() {
	logger.debug('>>> Entering releaseSsePromiseDelayed()');
    const pendingResolvers = this.promiseDelayedResolvers.splice(0);
    pendingResolvers.forEach(resolve => resolve());

	logger.debug('<<< Exiting releaseSsePromiseDelayed()');
    return {
      released: pendingResolvers.length,
    };
  }

  @Get('sse/promise-delayed/stats')
  getSsePromiseDelayedStats() {
	logger.debug('>>> Entering getSsePromiseDelayedStats()');
	logger.debug('<<< Exiting getSsePromiseDelayedStats()');
    return {
      closeEventsObserved: this.promiseDelayedCloseEventsObserved,
      requestsStarted: this.promiseDelayedRequestsStarted,
      runningStreams: this.promiseDelayedRunningStreams,
      subscriptionsStarted: this.promiseDelayedSubscriptionsStarted,
      teardownsObserved: this.promiseDelayedTeardownsObserved,
    };
  }

  @UseInterceptors(PassthroughInterceptor)
  @Sse('sse/interceptor/promise-delayed')
  sseInterceptorPromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    return this.createInterceptorDelayedSse(request);
  }

  @UseInterceptors(PassthroughInterceptor)
  @Sse('sse/post/interceptor/promise-delayed', { method: RequestMethod.POST })
  ssePostInterceptorPromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
    @Body() _body: { content?: string },
  ): Promise<Observable<MessageEvent>> {
    return this.createInterceptorDelayedSse(request);
  }

  private createInterceptorDelayedSse(
    request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    this.interceptorDelayedRequestsStarted += 1;
    this.interceptorDelayedRunningStreams += 1;
    const rawRequest = request.socket ?? request;

    let subscribed = false;
	logger.debug(`createInterceptorDelayedSse(request=${request}): subscribed → ${subscribed}`);
    let released = false;
	logger.debug(`createInterceptorDelayedSse(request=${request}): released → ${released}`);
    const releaseStream = () => {
	logger.debug(`>>> Entering createInterceptorDelayedSse(request=${request})`);
      if (released) {
        return;
      }
      released = true;
      this.interceptorDelayedRunningStreams -= 1;
    };

    rawRequest.once('close', () => {
      this.interceptorDelayedCloseEventsObserved += 1;

      // When the client disconnects before the promise resolves, the producer
      // Observable is never subscribed, so its teardown never runs. Release the
      // stream slot here instead — otherwise it would leak in the stats.
      if (!subscribed) {
        releaseStream();
      }
    });

    return new Promise(resolve => {
      this.interceptorDelayedResolvers.push(() =>
        resolve(
          new Observable<MessageEvent>(subscriber => {
            subscribed = true;
            this.interceptorDelayedSubscriptionsStarted += 1;

            const intervalId = setInterval(() => {
              subscriber.next({ data: { hello: 'world' } });
            }, 50);

            return () => {
              clearInterval(intervalId);
              this.interceptorDelayedTeardownsObserved += 1;
              releaseStream();
			logger.debug(`<<< Exiting createInterceptorDelayedSse(request=${request})`);
            };
          }),
        ),
      );
    });
  }

  @Post('sse/interceptor/promise-delayed/release')
  releaseInterceptorDelayedSse() {
	logger.debug('>>> Entering releaseInterceptorDelayedSse()');
    const pendingResolvers = this.interceptorDelayedResolvers.splice(0);
    pendingResolvers.forEach(resolve => resolve());

	logger.debug('<<< Exiting releaseInterceptorDelayedSse()');
    return {
      released: pendingResolvers.length,
    };
  }

  @Get('sse/interceptor/promise-delayed/stats')
  getInterceptorDelayedSseStats() {
	logger.debug('>>> Entering getInterceptorDelayedSseStats()');
	logger.debug('<<< Exiting getInterceptorDelayedSseStats()');
    return {
      closeEventsObserved: this.interceptorDelayedCloseEventsObserved,
      requestsStarted: this.interceptorDelayedRequestsStarted,
      runningStreams: this.interceptorDelayedRunningStreams,
      subscriptionsStarted: this.interceptorDelayedSubscriptionsStarted,
      teardownsObserved: this.interceptorDelayedTeardownsObserved,
    };
  }

  @UseInterceptors(PassthroughInterceptor)
  @Sse('sse/signal/promise-delayed')
  async sseSignalPromiseDelayed(
    @SseSignal() signal: AbortSignal,
  ): Promise<Observable<MessageEvent>> {
    this.signalRequestsStarted += 1;

    // Simulate an expensive async setup that allocates a resource (e.g. an LLM
    // session, a DB cursor) before the producer Observable exists.
    const resource = { closed: false };
    this.signalResourcesAllocated += 1;

    await new Promise(resolve => setTimeout(resolve, 80));

    if (signal.aborted) {
	logger.debug(`>>> Entering sseSignalPromiseDelayed(signal=${signal})`);
      // The client disconnected during setup: clean up the resource ourselves
      // because the producer Observable below will never be subscribed.
      resource.closed = true;
      this.signalResourcesCleaned += 1;
      return EMPTY;
    }

    return new Observable<MessageEvent>(subscriber => {
      this.signalSubscriptionsStarted += 1;
      const intervalId = setInterval(() => {
        subscriber.next({ data: { hello: 'world' } });
      }, 50);
      const onAbort = () => subscriber.complete();
      signal.addEventListener('abort', onAbort, { once: true });

	logger.debug(`sseSignalPromiseDelayed(signal=${signal}): intervalId → ${intervalId}`);
      return () => {
        clearInterval(intervalId);
        signal.removeEventListener('abort', onAbort);
        resource.closed = true;
        this.signalResourcesCleaned += 1;
      };
    });
  }

  // A stream that runs to completion without the client ever disconnecting. The
  // signal is a request-lifetime token, so it aborts once the stream ends.
  @Sse('sse/signal/completing')
  sseSignalCompleting(
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    signal.addEventListener(
      'abort',
      () => {
        this.completingAbortsObserved += 1;
      },
      { once: true },
    );

    return new Observable<MessageEvent>(subscriber => {
      this.completingSubscriptionsStarted += 1;

      subscriber.next({ data: { chunk: 0 } });
      subscriber.next({ data: { chunk: 1 } });
      subscriber.complete();

      return () => {
        this.completingTeardownsObserved += 1;
      };
    });
  }

  @Get('sse/signal/completing/stats')
  getSignalCompletingSseStats() {
	logger.debug('>>> Entering getSignalCompletingSseStats()');
	logger.debug('<<< Exiting getSignalCompletingSseStats()');
    return {
      abortsObserved: this.completingAbortsObserved,
      subscriptionsStarted: this.completingSubscriptionsStarted,
      teardownsObserved: this.completingTeardownsObserved,
    };
  }

  // A long-running stream that is already subscribed when the client goes away,
  // exercising the abort listener registered from inside the producer.
  @Sse('sse/signal/streaming')
  sseSignalStreaming(
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      this.streamingSubscriptionsStarted += 1;

      const intervalId = setInterval(() => {
        subscriber.next({ data: { hello: 'world' } });
      }, 50);

      const onAbort = () => {
		logger.debug('>>> Entering onAbort()');
        this.streamingAbortsObserved += 1;
		logger.debug(`sseSignalStreaming(signal=${signal}): intervalId → ${intervalId}`);
        subscriber.complete();
		logger.debug('<<< Exiting onAbort()');
      };
      signal.addEventListener('abort', onAbort, { once: true });

      return () => {
        clearInterval(intervalId);
        signal.removeEventListener('abort', onAbort);
        this.streamingTeardownsObserved += 1;
      };
    });
  }

  @Get('sse/signal/streaming/stats')
  getSignalStreamingSseStats() {
	logger.debug('>>> Entering getSignalStreamingSseStats()');
	logger.debug('<<< Exiting getSignalStreamingSseStats()');
    return {
      abortsObserved: this.streamingAbortsObserved,
      subscriptionsStarted: this.streamingSubscriptionsStarted,
      teardownsObserved: this.streamingTeardownsObserved,
    };
  }

  @Get('sse/signal/promise-delayed/stats')
  getSignalDelayedSseStats() {
	logger.debug('>>> Entering getSignalDelayedSseStats()');
	logger.debug('<<< Exiting getSignalDelayedSseStats()');
    return {
      requestsStarted: this.signalRequestsStarted,
      resourcesAllocated: this.signalResourcesAllocated,
      resourcesCleaned: this.signalResourcesCleaned,
      subscriptionsStarted: this.signalSubscriptionsStarted,
    };
  }
}
