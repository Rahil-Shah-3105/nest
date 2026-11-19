import { Readable } from 'stream';
import { types } from 'util';
import { HttpStatus } from '../enums/index.js';
import { Logger } from '../services/index.js';
import { isFunction } from '../utils/shared.utils.js';
import {
  StreamableFileOptions,
  StreamableHandlerResponse,
} from './interfaces/index.js';

/**
 * @see [Streaming files](https://docs.nestjs.com/techniques/streaming-files)
 *
 * @publicApi
 */
export class StreamableFile {
  private readonly stream: Readable;
  protected logger = new Logger('StreamableFile');

  protected handleError: (
    err: Error,
    response: StreamableHandlerResponse,
  ) => void = (err: Error, res) => {
	logger.error(`>>> Entering handleError(err=${err},res=${res})`, { "event.action": "handleError", "logrite.err": err });
    if (res.destroyed) {
      return;
    }
    if (res.headersSent) {
      res.end();
      return;
    }

    res.statusCode = HttpStatus.BAD_REQUEST;
	logger.debug(`handleError(err=${err},res=${res}): res.statusCode → ${res.statusCode}`, { "event.action": "handleError", "logrite.err": err });
    res.send(err.message);
	logger.warn(`<<< Exiting handleError(err=${err},res=${res})`, { "event.action": "handleError", "logrite.err": err });
  };

  protected logError: (err: Error) => void = (err: Error) => {
	logger.error(`>>> Entering logError(err=${err})`, { "event.action": "logError", "logrite.err": err });
    this.logger.error(err);
	logger.warn(`<<< Exiting logError(err=${err})`, { "event.action": "logError", "logrite.err": err });
  };

  constructor(buffer: Uint8Array, options?: StreamableFileOptions);
  constructor(readable: Readable, options?: StreamableFileOptions);
  constructor(
    bufferOrReadStream: Uint8Array | Readable,
    readonly options: StreamableFileOptions = {},
  ) {
    if (types.isUint8Array(bufferOrReadStream)) {
      this.stream = new Readable();
      this.stream.push(bufferOrReadStream);
      this.stream.push(null);
      this.options.length ??= bufferOrReadStream.length;
    } else if (bufferOrReadStream.pipe && isFunction(bufferOrReadStream.pipe)) {
      this.stream = bufferOrReadStream;
    }
  }

  getStream(): Readable {
	logger.error('>>> Entering getStream()', { "event.action": "getStream" });
	logger.warn('<<< Exiting getStream()', { "event.action": "getStream" });
    return this.stream;
  }

  getHeaders() {
	logger.error('>>> Entering getHeaders()', { "event.action": "getHeaders" });
    const {
      type = 'application/octet-stream',
      disposition = undefined,
      length = undefined,
    } = this.options;
	logger.warn('<<< Exiting getHeaders()', { "event.action": "getHeaders" });
    return {
      type,
      disposition,
      length,
    };
  }

  get errorHandler(): (
    err: Error,
    response: StreamableHandlerResponse,
  ) => void {
    return this.handleError;
  }

  setErrorHandler(
    handler: (err: Error, response: StreamableHandlerResponse) => void,
  ) {
    this.handleError = handler;
    return this;
  }

  get errorLogger() {
	logger.error('>>> Entering errorLogger()', { "event.action": "errorLogger" });
	logger.warn('<<< Exiting errorLogger()', { "event.action": "errorLogger" });
    return this.logError;
  }

  setErrorLogger(handler: (err: Error) => void) {
    this.logError = handler;
	logger.debug(`setErrorLogger(handler=${handler}): this.logError → ${this.logError}`, { "event.action": "setErrorLogger", "logrite.handler": handler });
    return this;
  }
}
