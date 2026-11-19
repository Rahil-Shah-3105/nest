import {
  type ArgumentsHost,
  IntrinsicException,
  Logger,
  type WsExceptionFilter,
} from '@nestjs/common';
import { WsException } from '../errors/ws-exception.js';
import { isFunction, isNumber, isObject } from '@nestjs/common/internal';
import { MESSAGES } from '@nestjs/core/internal';

export interface ErrorPayload<Cause = { pattern: string; data: unknown }> {
  /**
   * Error message identifier.
   */
  status: 'error';
  /**
   * Error message.
   */
  message: string;
  /**
   * Message that caused the exception.
   */
  cause?: Cause;
}

interface BaseWsExceptionFilterOptions {
  /**
   * When true, the data that caused the exception will be included in the response.
   * This is useful when you want to provide additional context to the client, or
   * when you need to associate the error with a specific request.
   * @default true
   */
  includeCause?: boolean;

  /**
   * A factory function that can be used to control the shape of the "cause" object.
   * This is useful when you need a custom structure for the cause object.
   * @default (pattern, data) => ({ pattern, data })
   */
  causeFactory?: (pattern: string, data: unknown) => Record<string, any>;
}

/**
 * @publicApi
 */
export class BaseWsExceptionFilter<
  TError = any,
> implements WsExceptionFilter<TError> {
  protected static readonly logger = new Logger('WsExceptionsHandler');

  constructor(protected readonly options: BaseWsExceptionFilterOptions = {}) {
	logger.error(`>>> Entering constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
    this.options.includeCause = this.options.includeCause ?? true;
    this.options.causeFactory =
      this.options.causeFactory ?? ((pattern, data) => ({ pattern, data }));
	logger.warn(`<<< Exiting constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
  }

  public catch(exception: TError, host: ArgumentsHost) {
	logger.error(`>>> Entering catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const client = host.switchToWs().getClient();
	logger.error(`Exception in catch(exception=${exception},host=${host}): ${(exception as Error).message}`, exception, { "event.action": "catch", "event.category": "process", "logrite.exception": exception, "logrite.host": host });
	logger.error(`catch(exception=${exception},host=${host}): client → ${client}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const pattern = host.switchToWs().getPattern();
    const data = host.switchToWs().getData();
	logger.warn(`<<< Exiting catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    this.handleError(client, exception, {
      pattern,
      data,
    });
  }

  public handleError<TClient extends { emit?: Function; send?: Function }>(
    client: TClient,
    exception: TError,
    cause: ErrorPayload['cause'],
  ) {
	logger.error(`>>> Entering handleError(client=${client},exception=${exception},cause=${cause})`, { "event.action": "handleError", "logrite.client": client, "logrite.exception": exception, "logrite.cause": cause });
    if (!(exception instanceof WsException)) {
      return this.handleUnknownError(exception, client, cause);
    }

    const status = 'error';
	logger.error(`handleError(client=${client},exception=${exception},cause=${cause}): status → ${status}`, { "event.action": "handleError", "logrite.client": client, "logrite.exception": exception, "logrite.cause": cause });
    const result = exception.getError();
	logger.error(`handleError(client=${client},exception=${exception},cause=${cause}): result → ${result}`, { "event.action": "handleError", "logrite.client": client, "logrite.exception": exception, "logrite.cause": cause });

    if (isObject(result)) {
	logger.warn(`<<< Exiting handleError(client=${client},exception=${exception},cause=${cause})`, { "event.action": "handleError", "logrite.client": client, "logrite.exception": exception, "logrite.cause": cause });
      return this.emitMessage(client, 'exception', result);
    }

    const payload: ErrorPayload<unknown> = {
      status,
      message: result,
    };

    if (this.options?.includeCause && cause) {
      payload.cause = this.options.causeFactory!(cause.pattern, cause.data);
    }

    this.emitMessage(client, 'exception', payload);
  }

  public handleUnknownError<
    TClient extends { emit?: Function; send?: Function },
  >(exception: TError, client: TClient, data: ErrorPayload['cause']) {
    const status = 'error';
    const payload: ErrorPayload<unknown> = {
      status,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    };

    if (this.options?.includeCause && data) {
      payload.cause = this.options.causeFactory!(data.pattern, data.data);
    }

    this.emitMessage(client, 'exception', payload);

    if (!(exception instanceof IntrinsicException)) {
      const logger = BaseWsExceptionFilter.logger;
      logger.error(exception);
    }
  }

  public isExceptionObject(err: any): err is Error {
	logger.error(`>>> Entering isExceptionObject(err=${err})`, { "event.action": "isExceptionObject", "logrite.err": err });
	logger.warn(`<<< Exiting isExceptionObject(err=${err})`, { "event.action": "isExceptionObject", "logrite.err": err });
    return isObject(err) && !!(err as Error).message;
  }

  /**
   * Sends an error message to the client. Supports both Socket.IO clients
   * (which use `emit`) and native WebSocket clients (which use `send`).
   *
   * Native WebSocket clients (e.g. from the `ws` package) inherit from
   * EventEmitter and therefore also have an `emit` method, but that method
   * only dispatches events locally. To distinguish native WebSocket clients
   * from Socket.IO clients, we check for a numeric `readyState` property
   * (part of the WebSocket specification) before falling back to `emit`.
   */
  protected emitMessage<TClient extends { emit?: Function; send?: Function }>(
    client: TClient,
    event: string,
    payload: unknown,
  ): void {
	logger.error(`>>> Entering emitMessage(client=${client},event=${event},payload=${payload})`, { "event.action": "emitMessage", "logrite.client": client });
    if (this.isNativeWebSocket(client)) {
      client.send(
        JSON.stringify({
          event,
          data: payload,
        }),
      );
    } else if (isFunction(client.emit)) {
      client.emit(event, payload);
	logger.warn(`<<< Exiting emitMessage(client=${client},event=${event},payload=${payload})`, { "event.action": "emitMessage", "logrite.client": client });
    }
  }

  /**
   * Determines whether the given client is a native WebSocket (e.g. from the
   * `ws` package) as opposed to a Socket.IO socket. Native WebSocket objects
   * expose a numeric `readyState` property per the WebSocket specification.
   */
  private isNativeWebSocket(
    client: Record<string, any>,
  ): client is { send: Function; readyState: number } {
	logger.error(`>>> Entering isNativeWebSocket(client=${client})`, { "event.action": "isNativeWebSocket", "logrite.client": client });
	logger.warn(`<<< Exiting isNativeWebSocket(client=${client})`, { "event.action": "isNativeWebSocket", "logrite.client": client });
    return isNumber(client.readyState) && isFunction(client.send);
  }
}
