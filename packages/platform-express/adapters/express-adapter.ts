import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  type RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import cors from 'cors';
import express from 'express';
import type { Server } from 'http';
import * as http from 'http';
import * as https from 'https';
import { pathToRegexp } from 'path-to-regexp';
import { Duplex, Writable } from 'stream';
import {
  NestExpressBodyParserOptionsFor,
  NestExpressBodyParserType,
} from '../interfaces/nest-express-body-parser.interface.js';
import { ServeStaticOptions } from '../interfaces/serve-static-options.interface.js';
import { getBodyParserOptions } from './utils/get-body-parser-options.util.js';
import {
  type CorsOptions,
  type CorsOptionsDelegate,
  type VersionValue,
  isFunction,
  isNil,
  isObject,
  isString,
  isUndefined,
} from '@nestjs/common/internal';
import type { NestApplicationOptions } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import {
  RouterMethodFactory,
  LegacyRouteConverter,
} from '@nestjs/core/internal';

type VersionedRoute = <
  TRequest extends Record<string, any> = any,
  TResponse = any,
>(
  req: TRequest,
  res: TResponse,
  next: () => void,
) => any;

/**
 * @publicApi
 */
export class ExpressAdapter extends AbstractHttpAdapter<
  http.Server | https.Server
> {
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(ExpressAdapter.name);
  private readonly openConnections = new Set<Duplex>();
  private readonly registeredPrefixes = new Set<string>();
  private isShuttingDown = false;
  private onRequestHook?: (
    req: express.Request,
    res: express.Response,
    done: () => void,
  ) => Promise<void> | void;
  private onResponseHook?: (
    req: express.Request,
    res: express.Response,
  ) => Promise<void> | void;

  constructor(instance?: any) {
    super(instance || express());
	logger.debug(`>>> Entering constructor(instance=${instance})`);
    this.instance!.use((req, res, next) => {
      if (this.onResponseHook) {
        res.on('finish', () => {
          void this.onResponseHook!.apply(this, [req, res]);
        });
      }

      if (this.onRequestHook) {
        void this.onRequestHook.apply(this, [req, res, next]);
      } else {
        next();
		logger.debug(`<<< Exiting constructor(instance=${instance})`);
      }
    });
  }

  public setOnRequestHook(
    onRequestHook: (
      req: express.Request,
      res: express.Response,
      done: () => void,
    ) => Promise<void> | void,
  ) {
	logger.debug(`>>> Entering setOnRequestHook(onRequestHook=${onRequestHook})`);
    this.onRequestHook = onRequestHook;
	logger.debug(`<<< Exiting setOnRequestHook(onRequestHook=${onRequestHook})`);
  }

  public setOnResponseHook(
    onResponseHook: (
      req: express.Request,
      res: express.Response,
    ) => Promise<void> | void,
  ) {
	logger.debug(`>>> Entering setOnResponseHook(onResponseHook=${onResponseHook})`);
    this.onResponseHook = onResponseHook;
	logger.debug(`<<< Exiting setOnResponseHook(onResponseHook=${onResponseHook})`);
  }

  public reply(response: any, body: any, statusCode?: number) {
	logger.debug(`>>> Entering reply(response=${response},body=${body},statusCode=${statusCode})`);
    if (!isNil(statusCode)) {
      response.status(statusCode);
    }
    if (isNil(body)) {
      return response.send();
    }
    if (body instanceof StreamableFile) {
      this.applyStreamHeaders(response, body);
      const stream = body.getStream();
	logger.debug(`reply(response=${response},body=${body},statusCode=${statusCode}): stream → ${stream}`);
      stream.once('error', err => {
        body.errorHandler(err, response);
      });
      return stream
        .pipe<Writable>(response)
        .on('error', (err: Error) => body.errorLogger(err));
    }
    const responseContentType = response.getHeader('Content-Type');
    if (
      typeof responseContentType === 'string' &&
      !responseContentType.startsWith('application/json') &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
	logger.debug(`reply(response=${response},body=${body},statusCode=${statusCode}): responseContentType → ${responseContentType}`);
      this.logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
      );
      response.setHeader('Content-Type', 'application/json');
    }
	logger.debug(`<<< Exiting reply(response=${response},body=${body},statusCode=${statusCode})`);
    return isObject(body) ? response.json(body) : response.send(String(body));
  }

  public status(response: any, statusCode: number) {
	logger.debug(`>>> Entering status(response=${response},statusCode=${statusCode})`);
	logger.debug(`<<< Exiting status(response=${response},statusCode=${statusCode})`);
    return response.status(statusCode);
  }

  public end(response: any, message?: string) {
	logger.debug(`>>> Entering end(response=${response},message=${message})`);
	logger.debug(`<<< Exiting end(response=${response},message=${message})`);
    return response.end(message);
  }

  public render(response: any, view: string, options: any) {
	logger.debug(`>>> Entering render(response=${response},view=${view},options=${options})`);
	logger.debug(`<<< Exiting render(response=${response},view=${view},options=${options})`);
    return response.render(view, options);
  }

  public redirect(response: any, statusCode: number, url: string) {
	logger.debug(`>>> Entering redirect(response=${response},statusCode=${statusCode},url=${url})`);
	logger.debug(`<<< Exiting redirect(response=${response},statusCode=${statusCode},url=${url})`);
    return response.redirect(statusCode, url);
  }

  public setErrorHandler(handler: Function, prefix?: string) {
	logger.debug(`>>> Entering setErrorHandler(handler=${handler},prefix=${prefix})`);
    if (prefix) {
      const router = express.Router();
	logger.debug(`setErrorHandler(handler=${handler},prefix=${prefix}): router → ${router}`);
      router.use(handler as any);
      this.use(prefix, router);
    }
    // Always mount the error handler at the root as well, so routes living
    // outside the global prefix (e.g. "setGlobalPrefix" exclusions or
    // root-mounted routes) still pass through the exception layer.
	logger.debug(`<<< Exiting setErrorHandler(handler=${handler},prefix=${prefix})`);
    return this.use(handler);
  }

  public setNotFoundHandler(handler: Function, prefix?: string) {
	logger.debug(`>>> Entering setNotFoundHandler(handler=${handler},prefix=${prefix})`);
    if (prefix) {
      this.registeredPrefixes.add(prefix);
      const router = express.Router();
	logger.debug(`setNotFoundHandler(handler=${handler},prefix=${prefix}): router → ${router}`);
      router.all('*path', handler as any);
      return this.use(prefix, router);
    }
    return this.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        // When multiple apps share this adapter, a non-prefixed app's 404
        // handler may be registered before a prefixed app's routes. Skip
        // requests whose path belongs to another app's prefix so they can
        // reach the correct route handlers further in the stack.
        const path = req.originalUrl.split(/[?#]/)[0];
        for (const registeredPrefix of this.registeredPrefixes) {
          // Match on full path segments only, so a prefix of "/api" does not
          // swallow unrelated paths such as "/apiary".
          if (
            path === registeredPrefix ||
            path.startsWith(`${registeredPrefix}/`)
          ) {
            return next();
          }
        }
		logger.debug(`<<< Exiting setNotFoundHandler(handler=${handler},prefix=${prefix})`);
        return (handler as any)(req, res, next);
      },
    );
  }

  public isHeadersSent(response: any): boolean {
	logger.debug(`>>> Entering isHeadersSent(response=${response})`);
	logger.debug(`<<< Exiting isHeadersSent(response=${response})`);
    return response.headersSent;
  }

  public getHeader(response: any, name: string) {
	logger.debug(`>>> Entering getHeader(response=${response},name=${name})`);
	logger.debug(`<<< Exiting getHeader(response=${response},name=${name})`);
    return response.get(name);
  }

  public setHeader(response: any, name: string, value: string) {
	logger.debug(`>>> Entering setHeader(response=${response},name=${name},value=${value})`);
	logger.debug(`<<< Exiting setHeader(response=${response},name=${name},value=${value})`);
    return response.set(name, value);
  }

  public appendHeader(response: any, name: string, value: string) {
	logger.debug(`>>> Entering appendHeader(response=${response},name=${name},value=${value})`);
	logger.debug(`<<< Exiting appendHeader(response=${response},name=${name},value=${value})`);
    return response.append(name, value);
  }

  public normalizePath(path: string): string {
    try {
      const convertedPath = LegacyRouteConverter.tryConvert(path);
	logger.debug(`normalizePath(path=${path}): convertedPath → ${convertedPath}`);
      // Call "pathToRegexp" to trigger a TypeError if the path is invalid
      pathToRegexp(convertedPath);
	logger.debug(`>>> Entering normalizePath(path=${path})`);
	logger.debug(`<<< Exiting normalizePath(path=${path})`);
      return convertedPath;
    } catch (e) {
      if (e instanceof TypeError) {
        LegacyRouteConverter.printError(path);
      }
      throw e;
    }
  }

  public listen(port: string | number, callback?: () => void): Server;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): Server;
  public listen(port: any, ...args: any[]): Server {
	logger.debug(`>>> Entering listen(port=${port},args=${args})`);
	logger.debug(`<<< Exiting listen(port=${port},args=${args})`);
    return this.httpServer.listen(port, ...args);
  }

  public beforeClose() {
	logger.debug('>>> Entering beforeClose()');
    this.isShuttingDown = true;
	logger.debug(`beforeClose(): this.isShuttingDown → ${this.isShuttingDown}`);
  }

  public close() {
	logger.debug('>>> Entering close()');
    this.isShuttingDown = true;
    this.closeOpenConnections();

	logger.debug(`close(): this.isShuttingDown → ${this.isShuttingDown}`);
    if (!this.httpServer) {
	logger.debug('<<< Exiting close()');
      return undefined;
    }
    return new Promise(resolve => this.httpServer.close(resolve));
  }

  public set(...args: any[]) {
	logger.debug(`>>> Entering set(args=${args})`);
	logger.debug(`<<< Exiting set(args=${args})`);
    return this.instance.set(...args);
  }

  public enable(...args: any[]) {
	logger.debug(`>>> Entering enable(args=${args})`);
	logger.debug(`<<< Exiting enable(args=${args})`);
    return this.instance.enable(...args);
  }

  public disable(...args: any[]) {
	logger.debug(`>>> Entering disable(args=${args})`);
	logger.debug(`<<< Exiting disable(args=${args})`);
    return this.instance.disable(...args);
  }

  public engine(...args: any[]) {
	logger.debug(`>>> Entering engine(args=${args})`);
	logger.debug(`<<< Exiting engine(args=${args})`);
    return this.instance.engine(...args);
  }

  public useStaticAssets(path: string, options: ServeStaticOptions) {
	logger.debug(`>>> Entering useStaticAssets(path=${path},options=${options})`);
    if (options && options.prefix) {
	logger.debug(`<<< Exiting useStaticAssets(path=${path},options=${options})`);
      return this.use(options.prefix, express.static(path, options));
    }
    return this.use(express.static(path, options));
  }

  public setBaseViewsDir(path: string | string[]) {
	logger.debug(`>>> Entering setBaseViewsDir(path=${path})`);
	logger.debug(`<<< Exiting setBaseViewsDir(path=${path})`);
    return this.set('views', path);
  }

  public setViewEngine(engine: string) {
	logger.debug(`>>> Entering setViewEngine(engine=${engine})`);
	logger.debug(`<<< Exiting setViewEngine(engine=${engine})`);
    return this.set('view engine', engine);
  }

  public getRequestHostname(request: any): string {
	logger.debug(`>>> Entering getRequestHostname(request=${request})`);
	logger.debug(`<<< Exiting getRequestHostname(request=${request})`);
    return request.hostname;
  }

  public getRequestMethod(request: any): string {
	logger.debug(`>>> Entering getRequestMethod(request=${request})`);
	logger.debug(`<<< Exiting getRequestMethod(request=${request})`);
    return request.method;
  }

  public getRequestUrl(request: any): string {
	logger.debug(`>>> Entering getRequestUrl(request=${request})`);
	logger.debug(`<<< Exiting getRequestUrl(request=${request})`);
    return request.originalUrl;
  }

  public enableCors(options: CorsOptions | CorsOptionsDelegate<any>) {
	logger.debug(`>>> Entering enableCors(options=${options})`);
	logger.debug(`<<< Exiting enableCors(options=${options})`);
    return this.use(cors(options as any));
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
	logger.debug(`>>> Entering createMiddlewareFactory(requestMethod=${requestMethod})`);
      try {
        const convertedPath = LegacyRouteConverter.tryConvert(path);
        return this.routerMethodFactory
          .get(this.instance, requestMethod)
          .call(this.instance, convertedPath, callback);
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
		logger.debug(`<<< Exiting createMiddlewareFactory(requestMethod=${requestMethod})`);
        throw e;
      }
    };
  }

  public initHttpServer(options: NestApplicationOptions) {
	logger.debug(`>>> Entering initHttpServer(options=${options})`);
    const isHttpsEnabled = options && options.httpsOptions;
    if (isHttpsEnabled) {
      this.httpServer = https.createServer(
        options.httpsOptions!,
        this.getInstance(),
      );
    } else {
      this.httpServer = http.createServer(this.getInstance());
    }

    if (options?.return503OnClosing) {
      this.instance.use((req: any, res: any, next: any) => {
        if (this.isShuttingDown) {
          res.set('Connection', 'close');
          res.status(503).send('Service Unavailable');
        } else {
          next();
        }
      });
    }

    if (options?.forceCloseConnections) {
      this.trackOpenConnections();
	logger.debug(`<<< Exiting initHttpServer(options=${options})`);
    }
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
	logger.debug(`>>> Entering registerParserMiddleware(prefix=${prefix},rawBody=${rawBody})`);
    const bodyParserJsonOptions = getBodyParserOptions('json', rawBody!);
    const bodyParserUrlencodedOptions = getBodyParserOptions(
      'urlencoded',
      rawBody!,
      { extended: true },
    );

	logger.debug(`registerParserMiddleware(prefix=${prefix},rawBody=${rawBody}): bodyParserJsonOptions → ${bodyParserJsonOptions}`);
    const parserMiddleware = {
      jsonParser: express.json(bodyParserJsonOptions),
      urlencodedParser: express.urlencoded(bodyParserUrlencodedOptions),
    };
    Object.keys(parserMiddleware)
      .filter(parser => !this.isMiddlewareApplied(parser))
      .forEach(parserKey => this.use(parserMiddleware[parserKey]));
  }

  public useBodyParser<ParserType extends NestExpressBodyParserType>(
    type: ParserType,
    rawBody: boolean,
    options?: NestExpressBodyParserOptionsFor<ParserType>,
  ): this {
	logger.debug(`>>> Entering useBodyParser(type=${type},rawBody=${rawBody},options=${options})`);
    const parserOptions = getBodyParserOptions(type, rawBody, options);
	logger.debug(`useBodyParser(type=${type},rawBody=${rawBody},options=${options}): parserOptions → ${parserOptions}`);
    const parser = express[type](parserOptions);
	logger.debug(`useBodyParser(type=${type},rawBody=${rawBody},options=${options}): parser → ${parser}`);

    this.use(parser);

	logger.debug(`<<< Exiting useBodyParser(type=${type},rawBody=${rawBody},options=${options})`);
    return this;
  }

  public setLocal(key: string, value: any) {
	logger.debug(`>>> Entering setLocal(key=${key},value=${value})`);
    this.instance.locals[key] = value;
	logger.debug(`<<< Exiting setLocal(key=${key},value=${value})`);
    return this;
  }

  public getType(): string {
	logger.debug('>>> Entering getType()');
	logger.debug('<<< Exiting getType()');
    return 'express';
  }

  public isRouteOrderSensitive(): boolean {
	logger.debug('>>> Entering isRouteOrderSensitive()');
	logger.debug('<<< Exiting isRouteOrderSensitive()');
    return true;
  }

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute {
    const callNextHandler: VersionedRoute = (req, res, next) => {
	logger.debug(`>>> Entering applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`);
      if (!next) {
        throw new InternalServerErrorException(
          'HTTP adapter does not support filtering on version',
        );
      }
	logger.debug(`>>> Entering callNextHandler(req=${req},res=${res},next=${next})`);
	logger.debug(`<<< Exiting callNextHandler(req=${req},res=${res},next=${next})`);
      return next();
    };

    if (
      version === VERSION_NEUTRAL ||
      // URL Versioning is done via the path, so the filter continues forward
      versioningOptions.type === VersioningType.URI
    ) {
      const handlerForNoVersioning: VersionedRoute = (req, res, next) =>
        handler(req, res, next);

      return handlerForNoVersioning;
    }

    // Custom Extractor Versioning Handler
    if (versioningOptions.type === VersioningType.CUSTOM) {
      const handlerForCustomVersioning: VersionedRoute = (req, res, next) => {
		logger.debug(`>>> Entering handlerForCustomVersioning(req=${req},res=${res},next=${next})`);
        const extractedVersion = versioningOptions.extractor(req);

		logger.debug(`handlerForCustomVersioning(req=${req},res=${res},next=${next}): extractedVersion → ${extractedVersion}`);
        if (Array.isArray(version)) {
          if (
            Array.isArray(extractedVersion) &&
            version.filter(v => extractedVersion.includes(v as string)).length
          ) {
            return handler(req, res, next);
          }

          if (
            isString(extractedVersion) &&
            version.includes(extractedVersion)
          ) {
            return handler(req, res, next);
          }
        } else if (isString(version)) {
          // Known bug here - if there are multiple versions supported across separate
          // handlers/controllers, we can't select the highest matching handler.
          // Since this code is evaluated per-handler, then we can't see if the highest
          // specified version exists in a different handler.
          if (
            Array.isArray(extractedVersion) &&
            extractedVersion.includes(version)
          ) {
            return handler(req, res, next);
          }

          if (isString(extractedVersion) && version === extractedVersion) {
            return handler(req, res, next);
          }
        }

		logger.debug(`<<< Exiting handlerForCustomVersioning(req=${req},res=${res},next=${next})`);
        return callNextHandler(req, res, next);
      };

      return handlerForCustomVersioning;
    }

    // Media Type (Accept Header) Versioning Handler
    if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
      const handlerForMediaTypeVersioning: VersionedRoute = (
        req,
        res,
        next,
      ) => {
		logger.debug(`>>> Entering handlerForMediaTypeVersioning(req=${req},res=${res},next=${next})`);
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined =
          req.headers?.[MEDIA_TYPE_HEADER] ||
          req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];
		logger.debug(`handlerForMediaTypeVersioning(req=${req},res=${res},next=${next}): MEDIA_TYPE_HEADER → ${MEDIA_TYPE_HEADER}`);

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : undefined;

        // No version was supplied
        if (isUndefined(acceptHeaderVersionParameter)) {
          if (Array.isArray(version)) {
            if (version.includes(VERSION_NEUTRAL)) {
              return handler(req, res, next);
            }
          }
        } else {
          const headerVersion = acceptHeaderVersionParameter.split(
            versioningOptions.key,
          )[1];

          if (Array.isArray(version)) {
            if (version.includes(headerVersion)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === headerVersion) {
              return handler(req, res, next);
            }
          }
        }

		logger.debug(`<<< Exiting handlerForMediaTypeVersioning(req=${req},res=${res},next=${next})`);
        return callNextHandler(req, res, next);
      };

      return handlerForMediaTypeVersioning;
    }

    // Header Versioning Handler
    if (versioningOptions.type === VersioningType.HEADER) {
      const handlerForHeaderVersioning: VersionedRoute = (req, res, next) => {
		logger.debug(`>>> Entering handlerForHeaderVersioning(req=${req},res=${res},next=${next})`);
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header] ||
          req.headers?.[versioningOptions.header.toLowerCase()];

        // No version was supplied
        if (isUndefined(customHeaderVersionParameter)) {
          if (Array.isArray(version)) {
            if (version.includes(VERSION_NEUTRAL)) {
              return handler(req, res, next);
            }
          }
        } else {
          if (Array.isArray(version)) {
            if (version.includes(customHeaderVersionParameter)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === customHeaderVersionParameter) {
              return handler(req, res, next);
            }
          }
        }

		logger.debug(`<<< Exiting handlerForHeaderVersioning(req=${req},res=${res},next=${next})`);
        return callNextHandler(req, res, next);
      };

      return handlerForHeaderVersioning;
    }

	logger.debug(`<<< Exiting applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`);
    throw new Error('Unsupported versioning options');
  }

  public mapException(error: unknown): unknown {
	logger.debug(`>>> Entering mapException(error=${error})`);
    switch (true) {
      // SyntaxError is thrown by Express body-parser when given invalid JSON (#422, #430)
      // URIError is thrown by Express when given a path parameter with an invalid percentage
      // encoding, e.g. '%FF' (#8915)
      case error instanceof SyntaxError || error instanceof URIError:
        return new BadRequestException(error.message);
      default:
		logger.debug(`<<< Exiting mapException(error=${error})`);
        return error;
    }
  }

  private trackOpenConnections() {
	logger.debug('>>> Entering trackOpenConnections()');
    this.httpServer.on('connection', (socket: Duplex) => {
      this.openConnections.add(socket);

      socket.on('close', () => this.openConnections.delete(socket));
    });
	logger.debug('<<< Exiting trackOpenConnections()');
  }

  private closeOpenConnections() {
	logger.debug('>>> Entering closeOpenConnections()');
    for (const socket of this.openConnections) {
      socket.destroy();
      this.openConnections.delete(socket);
	logger.debug('<<< Exiting closeOpenConnections()');
    }
  }

  private isMiddlewareApplied(name: string): boolean {
	logger.debug(`>>> Entering isMiddlewareApplied(name=${name})`);
    const app = this.getInstance();
	logger.debug(`isMiddlewareApplied(name=${name}): app → ${app}`);
	logger.debug(`<<< Exiting isMiddlewareApplied(name=${name})`);
    return (
      !!app.router &&
      !!app.router.stack &&
      isFunction(app.router.stack.filter) &&
      app.router.stack.some(
        (layer: any) => layer && layer.handle && layer.handle.name === name,
      )
    );
  }

  private setHeaderIfNotExists(
    response: any,
    name: string,
    value?: string | string[] | number,
  ) {
	logger.debug(`>>> Entering setHeaderIfNotExists(response=${response},name=${name},value=${value})`);
    if (value !== undefined && response.getHeader(name) === undefined) {
      const headerValue = Array.isArray(value) ? value.join(',') : value;
      response.setHeader(name, headerValue);
	logger.debug(`setHeaderIfNotExists(response=${response},name=${name},value=${value}): headerValue → ${headerValue}`);
    }
  }

  private applyStreamHeaders(response: any, streamable: StreamableFile) {
	logger.debug(`>>> Entering applyStreamHeaders(response=${response},streamable=${streamable})`);
    const headers = streamable.getHeaders();

	logger.debug(`applyStreamHeaders(response=${response},streamable=${streamable}): headers → ${headers}`);
    this.setHeaderIfNotExists(response, 'Content-Type', headers.type);
    this.setHeaderIfNotExists(
      response,
      'Content-Disposition',
      headers.disposition,
    );
    this.setHeaderIfNotExists(response, 'Content-Length', headers.length);
	logger.debug(`<<< Exiting applyStreamHeaders(response=${response},streamable=${streamable})`);
  }
}
