import {
  type HttpServer,
  HttpStatus,
  Logger,
  RequestMethod,
  type MessageEvent,
  SSE_ABORT_CONTROLLER,
} from '@nestjs/common';
import { IncomingMessage } from 'http';
import { EMPTY, lastValueFrom, Observable, isObservable } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import {
  AdditionalHeaders,
  WritableHeaderStream,
  SseStream,
} from './sse-stream.js';
import { isObject } from '@nestjs/common/internal';

export interface CustomHeader {
  name: string;
  value: string | (() => string);
}

export interface RedirectResponse {
  url: string;
  statusCode?: number;
}

export class RouterResponseController {
  private readonly logger = new Logger(RouterResponseController.name);

  constructor(private readonly applicationRef: HttpServer) {}

  public async apply<TInput = any, TResponse = any>(
    result: TInput,
    response: TResponse,
    httpStatusCode?: number,
  ) {
    return this.applicationRef.reply(response, result, httpStatusCode);
  }

  public async redirect<TInput = any, TResponse = any>(
    resultOrDeferred: TInput,
    response: TResponse,
    redirectResponse: RedirectResponse,
  ) {
	logger.debug(`>>> Entering redirect(resultOrDeferred=${resultOrDeferred},response=${response},redirectResponse=${redirectResponse})`);
    const result = await this.transformToResult(resultOrDeferred);
    const statusCode =
      result && result.statusCode
        ? result.statusCode
        : redirectResponse.statusCode
          ? redirectResponse.statusCode
          : HttpStatus.FOUND;
    const url = result && result.url ? result.url : redirectResponse.url;
    this.applicationRef.redirect(response, statusCode, url);
	logger.debug(`<<< Exiting redirect(resultOrDeferred=${resultOrDeferred},response=${response},redirectResponse=${redirectResponse})`);
  }

  public async render<TInput = unknown, TResponse = unknown>(
    resultOrDeferred: TInput,
    response: TResponse,
    template: string,
  ) {
	logger.debug(`>>> Entering render(resultOrDeferred=${resultOrDeferred},response=${response},template=${template})`);
    const result = await this.transformToResult(resultOrDeferred);
    return this.applicationRef.render(response, template, result);
  }

  public async transformToResult(resultOrDeferred: any) {
	logger.debug(`>>> Entering transformToResult(resultOrDeferred=${resultOrDeferred})`);
    if (isObservable(resultOrDeferred)) {
	logger.debug(`<<< Exiting transformToResult(resultOrDeferred=${resultOrDeferred})`);
      return lastValueFrom(resultOrDeferred);
    }
    return resultOrDeferred;
  }

  public getStatusByMethod(requestMethod: RequestMethod): number {
	logger.debug(`>>> Entering getStatusByMethod(requestMethod=${requestMethod})`);
    switch (requestMethod) {
      case RequestMethod.POST:
        return HttpStatus.CREATED;
      default:
		logger.debug(`<<< Exiting getStatusByMethod(requestMethod=${requestMethod})`);
        return HttpStatus.OK;
    }
  }

  public setHeaders<TResponse = unknown>(
    response: TResponse,
    headers: CustomHeader[],
  ) {
	logger.debug(`>>> Entering setHeaders(response=${response},headers=${headers})`);
    headers.forEach(({ name, value }) =>
      this.applicationRef.setHeader(
        response,
        name,
        typeof value === 'function' ? value() : value,
      ),
    );
		logger.debug(`<<< Exiting setHeaders(response=${response},headers=${headers})`);
  }

  public setStatus<TResponse = unknown>(
    response: TResponse,
    statusCode: number,
  ) {
    this.applicationRef.status(response, statusCode);
  }

  public async sse<
    TInput extends Observable<unknown> = any,
    TResponse extends WritableHeaderStream = any,
    TRequest extends IncomingMessage = any,
  >(
    result: TInput | Promise<TInput>,
    response: TResponse,
    request: TRequest,
    options?: {
      additionalHeaders?: AdditionalHeaders;
      statusCode?: number;
    },
  ) {
    // It's possible that we sent headers already so don't use a stream
    if (response.writableEnded) {
      // The response is already gone: abort the request-scoped signal so
      // handler cleanup wired to @SseSignal() still runs, and swallow late
      // handler rejections that can no longer be delivered to the client.
      this.getOrCreateAbortController(request).abort();
      Promise.resolve(result).catch((err: unknown) => this.logger.error(err));
      return;
    }

    const stream = new SseStream(request);
    const statusCode =
      options?.statusCode ??
      (response as { statusCode?: number }).statusCode ??
      200;

    // Create a per-request AbortController and expose its signal on the request
    // object so async @Sse() handlers can observe client disconnects (via the
    // @SseSignal() parameter decorator) and stop/clean up in-flight setup work.
    // The controller is reused if one was already attached upstream (e.g. when the
    // handler is wrapped by interceptors and the signal was created earlier).
    const abortController = this.getOrCreateAbortController(request);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let closeRequested = false;
      let subscription: { unsubscribe(): void } | undefined;
      const disconnectSource = request.socket ?? response;

      // Ends the request-scoped lifetime: stops listening for disconnects and
      // aborts the signal handed to the route handler. Every terminal path of
      // the SSE lifecycle (disconnect, completion, error) funnels through here,
      // so a handler that ties its resources to the signal releases them once,
      // regardless of how the stream ended. `abort()` is idempotent, so paths
      // that already aborted on disconnect are unaffected.
      const finalize = () => {
		logger.debug('>>> Entering finalize()');
        disconnectSource.removeListener('close', onClose);
        abortController.abort();
		logger.debug('<<< Exiting finalize()');
      };

      const endStream = () => {
		logger.debug('>>> Entering endStream()');
        if (!stream.writableEnded) {
          stream.end();
		logger.debug('<<< Exiting endStream()');
        }
      };

      const onClose = () => {
		logger.debug('>>> Entering onClose()');
        if (settled || closeRequested) {
          return;
        }

        closeRequested = true;

        if (!subscription) {
          finalize();
          return;
        }

        settled = true;
        finalize();
        subscription?.unsubscribe();
        endStream();
        response.end();
        resolve();
		logger.debug('<<< Exiting onClose()');
      };

      disconnectSource.once('close', onClose);

      Promise.resolve(result)
        .then(observableResult => {
          if (settled) {
            return;
          }

          this.assertObservable(observableResult);

          if (closeRequested) {
            // The client disconnected while the async handler was resolving.
            // Do not subscribe the producer Observable after the consumer has
            // already gone away — subscribing only to abort it in the same tick
            // would start producer side effects just to immediately cancel them.
            settled = true;
            endStream();
            response.end();
            resolve();
            return;
          }

          stream.pipe(response, {
            additionalHeaders: options?.additionalHeaders,
            statusCode,
          });

          subscription = observableResult
            .pipe(
              map((message): MessageEvent => {
                if (isObject(message)) {
                  return message as MessageEvent;
                }

                return { data: message as object | string };
              }),
              concatMap(
                message =>
                  new Promise<void>(resolve =>
                    stream.writeMessage(message, () => resolve()),
                  ),
              ),
              catchError(err => {
                if (!stream.headersCommitted) {
                  throw err;
                }

                const data = err instanceof Error ? err.message : err;
                stream.writeMessage({ type: 'error', data }, writeError => {
                  if (writeError) {
                    this.logger.error(writeError);
                  }
                });

                return EMPTY;
              }),
            )
            .subscribe({
              error: err => {
                if (settled) {
                  return;
                }
                settled = true;
                finalize();
                endStream();
                reject(err);
              },
              complete: () => {
                if (settled) {
                  return;
                }
                settled = true;
                finalize();
                endStream();
                resolve();
              },
            });

          // Commit SSE headers on the next macrotask. Pipe validation errors
          // propagate through microtasks (which complete before macrotasks),
          // so if the lifecycle errored, `settled` is already true and we
          // skip the write. Otherwise headers are sent immediately rather
          // than waiting for the first Observable emission.
          setTimeout(() => {
            if (!settled) {
              stream.commitHeaders();
            }
          }, 0);
        })
        .catch(err => {
          if (settled) {
            return;
          }

          if (closeRequested) {
            settled = true;
            endStream();
            response.end();
            resolve();
            return;
          }

          settled = true;
          finalize();
          endStream();
          reject(err);
        });
    });
  }

  private assertObservable(value: any) {
	logger.debug(`>>> Entering assertObservable(value=${value})`);
    if (!isObservable(value)) {
	logger.debug(`<<< Exiting assertObservable(value=${value})`);
      throw new ReferenceError(
        'You must return an Observable stream to use Server-Sent Events (SSE).',
      );
    }
  }

  private getOrCreateAbortController(
    request: IncomingMessage,
  ): AbortController {
    const carrier = request as IncomingMessage & {
      [SSE_ABORT_CONTROLLER]?: AbortController;
    };
    if (!carrier[SSE_ABORT_CONTROLLER]) {
	logger.debug(`>>> Entering getOrCreateAbortController(request=${request})`);
      carrier[SSE_ABORT_CONTROLLER] = new AbortController();
    }
	logger.debug(`<<< Exiting getOrCreateAbortController(request=${request})`);
    return carrier[SSE_ABORT_CONTROLLER];
  }
}
