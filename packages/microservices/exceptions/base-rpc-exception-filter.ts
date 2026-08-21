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
    const status = 'error';
	logger.debug(`catch(exception=${exception},host=${host}): status → ${status}`);
    if (!(exception instanceof RpcException)) {
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
      return this.handleUnknownError(exception, status);
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
	logger.debug(`catch(exception=${exception},host=${host}): res → ${res}`);
	logger.debug(`<<< Exiting catch(exception=${exception},host=${host})`);
    return _throw(() => message);
  }

  public handleUnknownError(exception: T, status: string) {
	logger.debug(`>>> Entering handleUnknownError(exception=${exception},status=${status})`);
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    if (!(exception instanceof IntrinsicException)) {
      const logger = BaseRpcExceptionFilter.logger;
      logger.error(exception);
    }

	logger.debug(`<<< Exiting handleUnknownError(exception=${exception},status=${status})`);
    return _throw(() => ({ status, message: errorMessage }));
  }

  public isError(exception: any): exception is Error {
	logger.debug(`>>> Entering isError(exception=${exception})`);
	logger.debug(`<<< Exiting isError(exception=${exception})`);
    return !!(isObject(exception) && (exception as Error).message);
  }
}
