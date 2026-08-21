import { Injectable, Optional } from '../decorators/core/index.js';
import { isObject } from '../utils/shared.utils.js';
import { ConsoleLogger } from './console-logger.service.js';
import { isLogLevelEnabled } from './utils/index.js';

export const LOG_LEVELS = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
] as const satisfies string[];

/**
 * @publicApi
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * @publicApi
 */
export interface LoggerService {
  /**
   * Write a 'log' level log.
   */
  log(message: any, ...optionalParams: any[]): any;

  /**
   * Write an 'error' level log.
   */
  error(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'debug' level log.
   */
  debug?(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'verbose' level log.
   */
  verbose?(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'fatal' level log.
   */
  fatal?(message: any, ...optionalParams: any[]): any;

  /**
   * Set log levels.
   * @param levels log levels
   */
  setLogLevels?(levels: LogLevel[]): any;
}

interface LogBufferRecord {
  /**
   * Method to execute.
   */
  methodRef: Function;

  /**
   * Arguments to pass to the method.
   */
  arguments: unknown[];
}

const DEFAULT_LOGGER = new ConsoleLogger();

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
});

/**
 * @publicApi
 */
@Injectable()
export class Logger implements LoggerService {
  protected static logBuffer = new Array<LogBufferRecord>();
  protected static staticInstanceRef?: LoggerService = DEFAULT_LOGGER;
  protected static logLevels?: LogLevel[];
  private static isBufferAttached: boolean;

  protected localInstanceRef?: LoggerService;

  private static WrapBuffer: MethodDecorator = (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const originalFn = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
	DEFAULT_LOGGER.debug(`>>> Entering function(args=${args})`);
      if (Logger.isBufferAttached) {
        Logger.logBuffer.push({
          methodRef: originalFn.bind(this),
          arguments: args,
        });
        return;
      }
	DEFAULT_LOGGER.debug(`<<< Exiting function(args=${args})`);
      return originalFn.call(this, ...args);
    };
  };

  constructor();
  constructor(context: string);
  constructor(context: string, options?: { timestamp?: boolean });
  constructor(
    @Optional() protected context?: string,
    @Optional() protected options: { timestamp?: boolean } = {},
  ) {}

  get localInstance(): LoggerService {
    if (Logger.staticInstanceRef === DEFAULT_LOGGER) {
      return this.registerLocalInstanceRef();
    } else if (Logger.staticInstanceRef instanceof Logger) {
      const prototype = Object.getPrototypeOf(Logger.staticInstanceRef);
      if (prototype.constructor === Logger) {
        return this.registerLocalInstanceRef();
      }
    }
    return Logger.staticInstanceRef!;
  }

  /**
   * Write an 'error' level log.
   */
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  @Logger.WrapBuffer
  error(message: any, ...optionalParams: any[]) {
	DEFAULT_LOGGER.debug(`>>> Entering error(message=${message},optionalParams=${optionalParams})`);
    optionalParams = this.context
      ? (optionalParams.length ? optionalParams : [undefined]).concat(
          this.context,
        )
      : optionalParams;

    this.localInstance?.error(message, ...optionalParams);
	DEFAULT_LOGGER.debug(`<<< Exiting error(message=${message},optionalParams=${optionalParams})`);
  }

  /**
   * Write a 'log' level log.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  log(message: any, ...optionalParams: any[]) {
	DEFAULT_LOGGER.debug(`>>> Entering log(message=${message},optionalParams=${optionalParams})`);
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.log(message, ...optionalParams);
	DEFAULT_LOGGER.debug(`<<< Exiting log(message=${message},optionalParams=${optionalParams})`);
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  warn(message: any, ...optionalParams: any[]) {
	DEFAULT_LOGGER.debug(`>>> Entering warn(message=${message},optionalParams=${optionalParams})`);
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.warn(message, ...optionalParams);
	DEFAULT_LOGGER.debug(`<<< Exiting warn(message=${message},optionalParams=${optionalParams})`);
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  debug(message: any, ...optionalParams: any[]) {
	DEFAULT_LOGGER.debug(`>>> Entering debug(message=${message},optionalParams=${optionalParams})`);
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.debug?.(message, ...optionalParams);
	DEFAULT_LOGGER.debug(`<<< Exiting debug(message=${message},optionalParams=${optionalParams})`);
  }

  /**
   * Write a 'verbose' level log.
   */
  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  verbose(message: any, ...optionalParams: any[]) {
	DEFAULT_LOGGER.debug(`>>> Entering verbose(message=${message},optionalParams=${optionalParams})`);
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.verbose?.(message, ...optionalParams);
	DEFAULT_LOGGER.debug(`<<< Exiting verbose(message=${message},optionalParams=${optionalParams})`);
  }

  /**
   * Write a 'fatal' level log.
   */
  fatal(message: any, context?: string): void;
  fatal(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  fatal(message: any, ...optionalParams: any[]) {
	DEFAULT_LOGGER.debug(`>>> Entering fatal(message=${message},optionalParams=${optionalParams})`);
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.fatal?.(message, ...optionalParams);
	DEFAULT_LOGGER.debug(`<<< Exiting fatal(message=${message},optionalParams=${optionalParams})`);
  }

  /**
   * Write an 'error' level log.
   */
  static error(message: any, stackOrContext?: string): void;
  static error(message: any, context?: string): void;
  static error(message: any, stack?: string, context?: string): void;
  static error(
    message: any,
    ...optionalParams: [...any, string?, string?]
  ): void;
  @Logger.WrapBuffer
  static error(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.error(message, ...optionalParams);
  }

  /**
   * Write a 'log' level log.
   */
  static log(message: any, context?: string): void;
  static log(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static log(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.log(message, ...optionalParams);
  }

  /**
   * Write a 'warn' level log.
   */
  static warn(message: any, context?: string): void;
  static warn(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static warn(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.warn(message, ...optionalParams);
  }

  /**
   * Write a 'debug' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  static debug(message: any, context?: string): void;
  static debug(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static debug(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.debug?.(message, ...optionalParams);
  }

  /**
   * Write a 'verbose' level log.
   */
  static verbose(message: any, context?: string): void;
  static verbose(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static verbose(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.verbose?.(message, ...optionalParams);
  }

  /**
   * Write a 'fatal' level log.
   */
  static fatal(message: any, context?: string): void;
  static fatal(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static fatal(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.fatal?.(message, ...optionalParams);
  }

  /**
   * Print buffered logs and detach buffer.
   */
  static flush() {
	DEFAULT_LOGGER.debug('>>> Entering flush()');
    this.isBufferAttached = false;
    this.logBuffer.forEach(item =>
      item.methodRef(...(item.arguments as [string])),
    );
	DEFAULT_LOGGER.debug(`flush(): this.isBufferAttached → ${this.isBufferAttached}`);
    this.logBuffer = [];
  }

  /**
   * Attach buffer.
   * Turns on initialization logs buffering.
   */
  static attachBuffer() {
	DEFAULT_LOGGER.debug('>>> Entering attachBuffer()');
	DEFAULT_LOGGER.debug(`attachBuffer(): this.isBufferAttached → ${this.isBufferAttached}`);
    this.isBufferAttached = true;
  }

  /**
   * Detach buffer.
   * Turns off initialization logs buffering.
   */
  static detachBuffer() {
	DEFAULT_LOGGER.debug('>>> Entering detachBuffer()');
	DEFAULT_LOGGER.debug(`detachBuffer(): this.isBufferAttached → ${this.isBufferAttached}`);
    this.isBufferAttached = false;
  }

  static getTimestamp() {
	DEFAULT_LOGGER.debug('>>> Entering getTimestamp()');
	DEFAULT_LOGGER.debug('<<< Exiting getTimestamp()');
    return dateTimeFormatter.format(Date.now());
  }

  static overrideLogger(logger: LoggerService | LogLevel[] | boolean) {
	DEFAULT_LOGGER.debug(`>>> Entering overrideLogger(logger=${logger})`);
    if (Array.isArray(logger)) {
      Logger.logLevels = logger;
	DEFAULT_LOGGER.debug(`overrideLogger(logger=${logger}): Logger.logLevels → ${Logger.logLevels}`);
      return this.staticInstanceRef?.setLogLevels?.(logger);
    }
    if (isObject(logger)) {
      if (logger instanceof Logger && logger.constructor !== Logger) {
        const errorMessage = `Using the "extends Logger" instruction is not allowed in Nest v9. Please, use "extends ConsoleLogger" instead.`;
		DEFAULT_LOGGER.debug(`overrideLogger(logger=${logger}): errorMessage → ${errorMessage}`);
        this.staticInstanceRef?.error(errorMessage);
        throw new Error(errorMessage);
      }
      this.staticInstanceRef = logger as LoggerService;
    } else {
	DEFAULT_LOGGER.debug(`overrideLogger(logger=${logger}): this.staticInstanceRef → ${this.staticInstanceRef}`);
      this.staticInstanceRef = undefined;
    }
	DEFAULT_LOGGER.debug(`<<< Exiting overrideLogger(logger=${logger})`);
  }

  static isLevelEnabled(level: LogLevel): boolean {
	DEFAULT_LOGGER.debug(`>>> Entering isLevelEnabled(level=${level})`);
    const logLevels = Logger.logLevels;
	DEFAULT_LOGGER.debug(`<<< Exiting isLevelEnabled(level=${level})`);
    return isLogLevelEnabled(level, logLevels);
  }

  private registerLocalInstanceRef() {
	DEFAULT_LOGGER.debug('>>> Entering registerLocalInstanceRef()');
    if (this.localInstanceRef) {
      return this.localInstanceRef;
    }
    this.localInstanceRef = new ConsoleLogger(this.context!, {
      timestamp: this.options?.timestamp,
      logLevels: Logger.logLevels,
    });
	DEFAULT_LOGGER.debug('<<< Exiting registerLocalInstanceRef()');
    return this.localInstanceRef;
  }
}
