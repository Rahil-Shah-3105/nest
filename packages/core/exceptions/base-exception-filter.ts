import {
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  type HttpServer,
  HttpStatus,
  Inject,
  IntrinsicException,
  Logger,
  Optional,
} from '@nestjs/common';
import { AbstractHttpAdapter } from '../adapters/index.js';
import { MESSAGES } from '../constants.js';
import { HttpAdapterHost } from '../helpers/http-adapter-host.js';
import { isObject } from '@nestjs/common/internal';

export class BaseExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger('ExceptionsHandler');

  @Optional()
  @Inject()
  protected readonly httpAdapterHost?: HttpAdapterHost;

  constructor(protected readonly applicationRef?: HttpServer) {}

  catch(exception: T, host: ArgumentsHost) {
	logger.error(`>>> Entering catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const applicationRef =
      this.applicationRef ||
      (this.httpAdapterHost && this.httpAdapterHost.httpAdapter)!;
	logger.error(`Exception in catch(exception=${exception},host=${host}): ${(exception as Error).message}`, exception, { "event.action": "catch", "event.category": "process", "logrite.exception": exception, "logrite.host": host });

    if (!(exception instanceof HttpException)) {
      return this.handleUnknownError(exception, host, applicationRef);
    }
    const res = exception.getResponse();
	logger.error(`catch(exception=${exception},host=${host}): res → ${res}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };

	logger.error(`catch(exception=${exception},host=${host}): message → ${message}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const response = host.getArgByIndex(1);
	logger.error(`catch(exception=${exception},host=${host}): response → ${response}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, message, exception.getStatus());
    } else {
      applicationRef.end(response);
	logger.warn(`<<< Exiting catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    }
  }

  public handleUnknownError(
    exception: T,
    host: ArgumentsHost,
    applicationRef: AbstractHttpAdapter | HttpServer,
  ) {
    const body = this.isHttpError(exception)
      ? {
          statusCode: exception.statusCode,
          message: exception.message,
        }
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        };

    const response = host.getArgByIndex(1);
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, body, body.statusCode);
    } else {
      applicationRef.end(response);
    }

    if (!(exception instanceof IntrinsicException)) {
      BaseExceptionFilter.logger.error(exception);
    }
	logger.warn(`<<< Exiting handleUnknownError(exception=${exception},host=${host},applicationRef=${applicationRef})`, { "event.action": "handleUnknownError", "logrite.exception": exception, "logrite.host": host, "logrite.applicationRef": applicationRef });
  }

  public isExceptionObject(err: any): err is Error {
	logger.error(`>>> Entering isExceptionObject(err=${err})`, { "event.action": "isExceptionObject", "logrite.err": err });
	logger.warn(`<<< Exiting isExceptionObject(err=${err})`, { "event.action": "isExceptionObject", "logrite.err": err });
    return isObject(err) && !!(err as Error).message;
  }

  /**
   * Checks if the thrown error is a FastifyError or comes from the "http-errors" library.
   * @param err error object
   */
  public isHttpError(err: any): err is { statusCode: number; message: string } {
	logger.error(`>>> Entering isHttpError(err=${err})`, { "event.action": "isHttpError", "logrite.err": err });
    if (!err || typeof err !== 'object') {
      return false;
    }

    if (
      err.constructor?.name === 'FastifyError' &&
      typeof err.code === 'string' &&
      typeof err.statusCode === 'number'
    ) {
      return true;
    }

    // "http-errors" error signature
    if (
      typeof err.expose === 'boolean' &&
      typeof err.statusCode === 'number' &&
      err.status === err.statusCode &&
      err instanceof Error
    ) {
      return true;
    }

    // Plain "http error"-shaped values (e.g. objects thrown by third-party
    // middleware) that carry a status code and a message
	logger.warn(`<<< Exiting isHttpError(err=${err})`, { "event.action": "isHttpError", "logrite.err": err });
    return !!(err.statusCode && err.message);
  }
}
