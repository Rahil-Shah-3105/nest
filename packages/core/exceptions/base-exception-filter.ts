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
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
    const applicationRef =
      this.applicationRef ||
      (this.httpAdapterHost && this.httpAdapterHost.httpAdapter)!;

    if (!(exception instanceof HttpException)) {
      return this.handleUnknownError(exception, host, applicationRef);
    }
    const res = exception.getResponse();
	logger.debug(`catch(exception=${exception},host=${host}): res → ${res}`);
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };

	logger.debug(`catch(exception=${exception},host=${host}): message → ${message}`);
    const response = host.getArgByIndex(1);
	logger.debug(`catch(exception=${exception},host=${host}): response → ${response}`);
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, message, exception.getStatus());
    } else {
      applicationRef.end(response);
	logger.debug(`<<< Exiting catch(exception=${exception},host=${host})`);
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
	logger.debug(`<<< Exiting handleUnknownError(exception=${exception},host=${host},applicationRef=${applicationRef})`);
  }

  public isExceptionObject(err: any): err is Error {
	logger.debug(`>>> Entering isExceptionObject(err=${err})`);
	logger.debug(`<<< Exiting isExceptionObject(err=${err})`);
    return isObject(err) && !!(err as Error).message;
  }

  /**
   * Checks if the thrown error is a FastifyError or comes from the "http-errors" library.
   * @param err error object
   */
  public isHttpError(err: any): err is { statusCode: number; message: string } {
    if (!err || typeof err !== 'object') {
	logger.debug(`>>> Entering isHttpError(err=${err})`);
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
	logger.debug(`<<< Exiting isHttpError(err=${err})`);
      return true;
    }

    // Plain "http error"-shaped values (e.g. objects thrown by third-party
    // middleware) that carry a status code and a message
    return !!(err.statusCode && err.message);
  }
}
