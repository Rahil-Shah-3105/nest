import {
  type ArgumentsHost,
  IntrinsicException,
  Logger,
  type RpcExceptionFilter,
} from '@nestjs/common';
import { Observable, throwError as _throw } from 'rxjs';
import { RpcException } from './rpc-exception.js';
import { isObject } from '@nestjs/common/internal';
import { MESSAGES } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class BaseRpcExceptionFilter<
  T = any,
  R = any,
> implements RpcExceptionFilter<T> {
  private static readonly logger = new Logger('RpcExceptionsHandler');

  public catch(exception: T, host: ArgumentsHost): Observable<R> {
	logger.error(`>>> Entering catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const status = 'error';
	logger.error(`Exception in catch(exception=${exception},host=${host}): ${(exception as Error).message}`, exception, { "event.action": "catch", "event.category": "process", "logrite.exception": exception, "logrite.host": host });
	logger.error(`catch(exception=${exception},host=${host}): status → ${status}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    if (!(exception instanceof RpcException)) {
      return this.handleUnknownError(exception, status);
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
	logger.error(`catch(exception=${exception},host=${host}): res → ${res}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
	logger.warn(`<<< Exiting catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    return _throw(() => message);
  }

  public handleUnknownError(exception: T, status: string) {
	logger.error(`>>> Entering handleUnknownError(exception=${exception},status=${status})`, { "event.action": "handleUnknownError", "logrite.exception": exception, "logrite.status": status });
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    if (!(exception instanceof IntrinsicException)) {
      const logger = BaseRpcExceptionFilter.logger;
      logger.error(exception);
    }

	logger.warn(`<<< Exiting handleUnknownError(exception=${exception},status=${status})`, { "event.action": "handleUnknownError", "logrite.exception": exception, "logrite.status": status });
    return _throw(() => ({ status, message: errorMessage }));
  }

  public isError(exception: any): exception is Error {
	logger.error(`>>> Entering isError(exception=${exception})`, { "event.action": "isError", "logrite.exception": exception });
	logger.warn(`<<< Exiting isError(exception=${exception})`, { "event.action": "isError", "logrite.exception": exception });
    return !!(isObject(exception) && (exception as Error).message);
  }
}
