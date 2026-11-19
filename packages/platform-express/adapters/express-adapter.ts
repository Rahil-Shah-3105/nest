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
	logger.error(`>>> Entering constructor(instance=${instance})`, { "event.action": "constructor", "logrite.instance": instance });
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
		logger.warn(`<<< Exiting constructor(instance=${instance})`, { "event.action": "constructor", "logrite.instance": instance });
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
	logger.error(`>>> Entering setOnRequestHook(onRequestHook=${onRequestHook})`, { "event.action": "setOnRequestHook", "logrite.onRequestHook": onRequestHook });
    this.onRequestHook = onRequestHook;
	logger.warn(`<<< Exiting setOnRequestHook(onRequestHook=${onRequestHook})`, { "event.action": "setOnRequestHook", "logrite.onRequestHook": onRequestHook });
  }

  public setOnResponseHook(
    onResponseHook: (
      req: express.Request,
      res: express.Response,
    ) => Promise<void> | void,
  ) {
	logger.error(`>>> Entering setOnResponseHook(onResponseHook=${onResponseHook})`, { "event.action": "setOnResponseHook", "logrite.onResponseHook": onResponseHook });
    this.onResponseHook = onResponseHook;
	logger.warn(`<<< Exiting setOnResponseHook(onResponseHook=${onResponseHook})`, { "event.action": "setOnResponseHook", "logrite.onResponseHook": onResponseHook });
  }

  public reply(response: any, body: any, statusCode?: number) {
	logger.error(`>>> Entering reply(response=${response},body=${body},statusCode=${statusCode})`, { "event.action": "reply", "logrite.statusCode": statusCode });
    if (!isNil(statusCode)) {
      response.status(statusCode);
    }
    if (isNil(body)) {
      return response.send();
    }
    if (body instanceof StreamableFile) {
      this.applyStreamHeaders(response, body);
      const stream = body.getStream();
	logger.error(`reply(response=${response},body=${body},statusCode=${statusCode}): stream → ${stream}`, { "event.action": "reply", "logrite.statusCode": statusCode });
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
	logger.error(`reply(response=${response},body=${body},statusCode=${statusCode}): responseContentType → ${responseContentType}`, { "event.action": "reply", "logrite.statusCode": statusCode });
      this.logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
      );
      response.setHeader('Content-Type', 'application/json');
    }
	logger.warn(`<<< Exiting reply(response=${response},body=${body},statusCode=${statusCode})`, { "event.action": "reply", "logrite.statusCode": statusCode });
    return isObject(body) ? response.json(body) : response.send(String(body));
  }

  public status(response: any, statusCode: number) {
	logger.error(`>>> Entering status(response=${response},statusCode=${statusCode})`, { "event.action": "status", "logrite.statusCode": statusCode });
	logger.warn(`<<< Exiting status(response=${response},statusCode=${statusCode})`, { "event.action": "status", "logrite.statusCode": statusCode });
    return response.status(statusCode);
  }

  public end(response: any, message?: string) {
	logger.error(`>>> Entering end(response=${response},message=${message})`, { "event.action": "end", "logrite.message": message });
	logger.warn(`<<< Exiting end(response=${response},message=${message})`, { "event.action": "end", "logrite.message": message });
    return response.end(message);
  }

  public render(response: any, view: string, options: any) {
    return response.render(view, options);
  }

  public redirect(response: any, statusCode: number, url: string) {
	logger.error(`>>> Entering redirect(response=${response},statusCode=${statusCode},url=${url})`, { "event.action": "redirect", "logrite.statusCode": statusCode, "logrite.url": url });
	logger.warn(`<<< Exiting redirect(response=${response},statusCode=${statusCode},url=${url})`, { "event.action": "redirect", "logrite.statusCode": statusCode, "logrite.url": url });
    return response.redirect(statusCode, url);
  }

  public setErrorHandler(handler: Function, prefix?: string) {
	logger.error(`>>> Entering setErrorHandler(handler=${handler},prefix=${prefix})`, { "event.action": "setErrorHandler", "logrite.handler": handler, "logrite.prefix": prefix });
    if (prefix) {
      const router = express.Router();
	logger.error(`setErrorHandler(handler=${handler},prefix=${prefix}): router → ${router}`, { "event.action": "setErrorHandler", "logrite.handler": handler, "logrite.prefix": prefix });
      router.use(handler as any);
      this.use(prefix, router);
    }
    // Always mount the error handler at the root as well, so routes living
    // outside the global prefix (e.g. "setGlobalPrefix" exclusions or
    // root-mounted routes) still pass through the exception layer.
	logger.warn(`<<< Exiting setErrorHandler(handler=${handler},prefix=${prefix})`, { "event.action": "setErrorHandler", "logrite.handler": handler, "logrite.prefix": prefix });
    return this.use(handler);
  }

  public setNotFoundHandler(handler: Function, prefix?: string) {
	logger.error(`>>> Entering setNotFoundHandler(handler=${handler},prefix=${prefix})`, { "event.action": "setNotFoundHandler", "logrite.handler": handler, "logrite.prefix": prefix });
    if (prefix) {
      this.registeredPrefixes.add(prefix);
      const router = express.Router();
	logger.error(`setNotFoundHandler(handler=${handler},prefix=${prefix}): router → ${router}`, { "event.action": "setNotFoundHandler", "logrite.handler": handler, "logrite.prefix": prefix });
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
		logger.warn(`<<< Exiting setNotFoundHandler(handler=${handler},prefix=${prefix})`, { "event.action": "setNotFoundHandler", "logrite.handler": handler, "logrite.prefix": prefix });
        return (handler as any)(req, res, next);
      },
    );
  }

  public isHeadersSent(response: any): boolean {
	logger.error(`>>> Entering isHeadersSent(response=${response})`, { "event.action": "isHeadersSent" });
	logger.warn(`<<< Exiting isHeadersSent(response=${response})`, { "event.action": "isHeadersSent" });
    return response.headersSent;
  }

  public getHeader(response: any, name: string) {
	logger.error(`>>> Entering getHeader(response=${response},name=${name})`, { "event.action": "getHeader", "logrite.name": name });
	logger.warn(`<<< Exiting getHeader(response=${response},name=${name})`, { "event.action": "getHeader", "logrite.name": name });
    return response.get(name);
  }

  public setHeader(response: any, name: string, value: string) {
	logger.error(`>>> Entering setHeader(response=${response},name=${name},value=${value})`, { "event.action": "setHeader", "logrite.name": name, "logrite.value": value });
	logger.warn(`<<< Exiting setHeader(response=${response},name=${name},value=${value})`, { "event.action": "setHeader", "logrite.name": name, "logrite.value": value });
    return response.set(name, value);
  }

  public appendHeader(response: any, name: string, value: string) {
	logger.error(`>>> Entering appendHeader(response=${response},name=${name},value=${value})`, { "event.action": "appendHeader", "logrite.name": name, "logrite.value": value });
	logger.warn(`<<< Exiting appendHeader(response=${response},name=${name},value=${value})`, { "event.action": "appendHeader", "logrite.name": name, "logrite.value": value });
    return response.append(name, value);
  }

  public normalizePath(path: string): string {
	logger.error(`>>> Entering normalizePath(path=${path})`, { "event.action": "normalizePath", "logrite.path": path });
    try {
      const convertedPath = LegacyRouteConverter.tryConvert(path);
	logger.error(`normalizePath(path=${path}): convertedPath → ${convertedPath}`, { "event.action": "normalizePath", "logrite.path": path });
      // Call "pathToRegexp" to trigger a TypeError if the path is invalid
      pathToRegexp(convertedPath);
	logger.warn(`<<< Exiting normalizePath(path=${path})`, { "event.action": "normalizePath", "logrite.path": path });
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
	logger.error(`>>> Entering listen(port=${port},args=${args})`, { "event.action": "listen", "logrite.port": port });
	logger.warn(`<<< Exiting listen(port=${port},args=${args})`, { "event.action": "listen", "logrite.port": port });
    return this.httpServer.listen(port, ...args);
  }

  public beforeClose() {
	logger.error('>>> Entering beforeClose()', { "event.action": "beforeClose" });
    this.isShuttingDown = true;
	logger.debug(`beforeClose(): this.isShuttingDown → ${this.isShuttingDown}`, { "event.action": "beforeClose" });
  }

  public close() {
	logger.error('>>> Entering close()', { "event.action": "close" });
    this.isShuttingDown = true;
    this.closeOpenConnections();
	logger.debug(`close(): this.isShuttingDown → ${this.isShuttingDown}`, { "event.action": "close" });

    if (!this.httpServer) {
      return undefined;
    }
	logger.warn('<<< Exiting close()', { "event.action": "close" });
    return new Promise(resolve => this.httpServer.close(resolve));
  }

  public set(...args: any[]) {
	logger.error(`>>> Entering set(args=${args})`, { "event.action": "set" });
	logger.warn(`<<< Exiting set(args=${args})`, { "event.action": "set" });
    return this.instance.set(...args);
  }

  public enable(...args: any[]) {
	logger.error(`>>> Entering enable(args=${args})`, { "event.action": "enable" });
	logger.warn(`<<< Exiting enable(args=${args})`, { "event.action": "enable" });
    return this.instance.enable(...args);
  }

  public disable(...args: any[]) {
	logger.error(`>>> Entering disable(args=${args})`, { "event.action": "disable" });
	logger.warn(`<<< Exiting disable(args=${args})`, { "event.action": "disable" });
    return this.instance.disable(...args);
  }

  public engine(...args: any[]) {
	logger.error(`>>> Entering engine(args=${args})`, { "event.action": "engine" });
	logger.warn(`<<< Exiting engine(args=${args})`, { "event.action": "engine" });
    return this.instance.engine(...args);
  }

  public useStaticAssets(path: string, options: ServeStaticOptions) {
	logger.error(`>>> Entering useStaticAssets(path=${path},options=${options})`, { "event.action": "useStaticAssets", "logrite.path": path, "logrite.options": options });
    if (options && options.prefix) {
      return this.use(options.prefix, express.static(path, options));
    }
	logger.warn(`<<< Exiting useStaticAssets(path=${path},options=${options})`, { "event.action": "useStaticAssets", "logrite.path": path, "logrite.options": options });
    return this.use(express.static(path, options));
  }

  public setBaseViewsDir(path: string | string[]) {
	logger.error(`>>> Entering setBaseViewsDir(path=${path})`, { "event.action": "setBaseViewsDir", "logrite.path": path });
	logger.warn(`<<< Exiting setBaseViewsDir(path=${path})`, { "event.action": "setBaseViewsDir", "logrite.path": path });
    return this.set('views', path);
  }

  public setViewEngine(engine: string) {
	logger.error(`>>> Entering setViewEngine(engine=${engine})`, { "event.action": "setViewEngine", "logrite.engine": engine });
	logger.warn(`<<< Exiting setViewEngine(engine=${engine})`, { "event.action": "setViewEngine", "logrite.engine": engine });
    return this.set('view engine', engine);
  }

  public getRequestHostname(request: any): string {
	logger.error(`>>> Entering getRequestHostname(request=${request})`, { "event.action": "getRequestHostname" });
	logger.warn(`<<< Exiting getRequestHostname(request=${request})`, { "event.action": "getRequestHostname" });
    return request.hostname;
  }

  public getRequestMethod(request: any): string {
	logger.error(`>>> Entering getRequestMethod(request=${request})`, { "event.action": "getRequestMethod" });
	logger.warn(`<<< Exiting getRequestMethod(request=${request})`, { "event.action": "getRequestMethod" });
    return request.method;
  }

  public getRequestUrl(request: any): string {
	logger.error(`>>> Entering getRequestUrl(request=${request})`, { "event.action": "getRequestUrl" });
	logger.warn(`<<< Exiting getRequestUrl(request=${request})`, { "event.action": "getRequestUrl" });
    return request.originalUrl;
  }

  public enableCors(options: CorsOptions | CorsOptionsDelegate<any>) {
	logger.error(`>>> Entering enableCors(options=${options})`, { "event.action": "enableCors", "logrite.options": options });
	logger.warn(`<<< Exiting enableCors(options=${options})`, { "event.action": "enableCors", "logrite.options": options });
    return this.use(cors(options as any));
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
	logger.error(`>>> Entering createMiddlewareFactory(requestMethod=${requestMethod})`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });
    return (path: string, callback: Function) => {
      try {
        const convertedPath = LegacyRouteConverter.tryConvert(path);
        return this.routerMethodFactory
          .get(this.instance, requestMethod)
          .call(this.instance, convertedPath, callback);
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
        throw e;
      }
    };
	logger.warn(`<<< Exiting createMiddlewareFactory(requestMethod=${requestMethod})`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });
  }

  public initHttpServer(options: NestApplicationOptions) {
	logger.error(`>>> Entering initHttpServer(options=${options})`, { "event.action": "initHttpServer", "logrite.options": options });
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
	logger.warn(`<<< Exiting initHttpServer(options=${options})`, { "event.action": "initHttpServer", "logrite.options": options });
    }
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
	logger.error(`>>> Entering registerParserMiddleware(prefix=${prefix},rawBody=${rawBody})`, { "event.action": "registerParserMiddleware", "logrite.prefix": prefix, "logrite.rawBody": rawBody });
    const bodyParserJsonOptions = getBodyParserOptions('json', rawBody!);
    const bodyParserUrlencodedOptions = getBodyParserOptions(
      'urlencoded',
      rawBody!,
      { extended: true },
    );

	logger.error(`registerParserMiddleware(prefix=${prefix},rawBody=${rawBody}): bodyParserJsonOptions → ${bodyParserJsonOptions}`, { "event.action": "registerParserMiddleware", "logrite.prefix": prefix, "logrite.rawBody": rawBody });
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
	logger.error(`>>> Entering useBodyParser(type=${type},rawBody=${rawBody},options=${options})`, { "event.action": "useBodyParser", "logrite.type": type, "logrite.rawBody": rawBody, "logrite.options": options });
    const parserOptions = getBodyParserOptions(type, rawBody, options);
    const parser = express[type](parserOptions);
	logger.error(`useBodyParser(type=${type},rawBody=${rawBody},options=${options}): parserOptions → ${parserOptions}`, { "event.action": "useBodyParser", "logrite.type": type, "logrite.rawBody": rawBody, "logrite.options": options });
	logger.error(`useBodyParser(type=${type},rawBody=${rawBody},options=${options}): parser → ${parser}`, { "event.action": "useBodyParser", "logrite.type": type, "logrite.rawBody": rawBody, "logrite.options": options });

    this.use(parser);

	logger.warn(`<<< Exiting useBodyParser(type=${type},rawBody=${rawBody},options=${options})`, { "event.action": "useBodyParser", "logrite.type": type, "logrite.rawBody": rawBody, "logrite.options": options });
    return this;
  }

  public setLocal(key: string, value: any) {
	logger.error(`>>> Entering setLocal(key=${key},value=${value})`, { "event.action": "setLocal", "logrite.key": key, "logrite.value": value });
    this.instance.locals[key] = value;
	logger.warn(`<<< Exiting setLocal(key=${key},value=${value})`, { "event.action": "setLocal", "logrite.key": key, "logrite.value": value });
    return this;
  }

  public getType(): string {
	logger.error('>>> Entering getType()', { "event.action": "getType" });
	logger.warn('<<< Exiting getType()', { "event.action": "getType" });
    return 'express';
  }

  public isRouteOrderSensitive(): boolean {
	logger.error('>>> Entering isRouteOrderSensitive()', { "event.action": "isRouteOrderSensitive" });
	logger.warn('<<< Exiting isRouteOrderSensitive()', { "event.action": "isRouteOrderSensitive" });
    return true;
  }

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute {
	logger.error(`>>> Entering applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`, { "event.action": "applyVersionFilter", "logrite.handler": handler, "logrite.version": version, "logrite.versioningOptions": versioningOptions });
    const callNextHandler: VersionedRoute = (req, res, next) => {
	logger.error(`>>> Entering callNextHandler(req=${req},res=${res},next=${next})`, { "event.action": "callNextHandler" });
      if (!next) {
        throw new InternalServerErrorException(
          'HTTP adapter does not support filtering on version',
        );
      }
	logger.warn(`<<< Exiting callNextHandler(req=${req},res=${res},next=${next})`, { "event.action": "callNextHandler" });
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
		logger.error(`>>> Entering handlerForCustomVersioning(req=${req},res=${res},next=${next})`, { "event.action": "handlerForCustomVersioning" });
        const extractedVersion = versioningOptions.extractor(req);

		logger.error(`handlerForCustomVersioning(req=${req},res=${res},next=${next}): extractedVersion → ${extractedVersion}`, { "event.action": "handlerForCustomVersioning" });
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

		logger.warn(`<<< Exiting handlerForCustomVersioning(req=${req},res=${res},next=${next})`, { "event.action": "handlerForCustomVersioning" });
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
		logger.error(`>>> Entering handlerForMediaTypeVersioning(req=${req},res=${res},next=${next})`, { "event.action": "handlerForMediaTypeVersioning" });
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined =
          req.headers?.[MEDIA_TYPE_HEADER] ||
          req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];
		logger.error(`handlerForMediaTypeVersioning(req=${req},res=${res},next=${next}): MEDIA_TYPE_HEADER → ${MEDIA_TYPE_HEADER}`, { "event.action": "handlerForMediaTypeVersioning" });

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

		logger.warn(`<<< Exiting handlerForMediaTypeVersioning(req=${req},res=${res},next=${next})`, { "event.action": "handlerForMediaTypeVersioning" });
        return callNextHandler(req, res, next);
      };

      return handlerForMediaTypeVersioning;
    }

    // Header Versioning Handler
    if (versioningOptions.type === VersioningType.HEADER) {
      const handlerForHeaderVersioning: VersionedRoute = (req, res, next) => {
		logger.error(`>>> Entering handlerForHeaderVersioning(req=${req},res=${res},next=${next})`, { "event.action": "handlerForHeaderVersioning" });
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

		logger.warn(`<<< Exiting handlerForHeaderVersioning(req=${req},res=${res},next=${next})`, { "event.action": "handlerForHeaderVersioning" });
        return callNextHandler(req, res, next);
      };

      return handlerForHeaderVersioning;
    }

	logger.warn(`<<< Exiting applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`, { "event.action": "applyVersionFilter", "logrite.handler": handler, "logrite.version": version, "logrite.versioningOptions": versioningOptions });
    throw new Error('Unsupported versioning options');
  }

  public mapException(error: unknown): unknown {
	logger.error(`>>> Entering mapException(error=${error})`, { "event.action": "mapException", "logrite.error": error });
    switch (true) {
      // SyntaxError is thrown by Express body-parser when given invalid JSON (#422, #430)
      // URIError is thrown by Express when given a path parameter with an invalid percentage
      // encoding, e.g. '%FF' (#8915)
      case error instanceof SyntaxError || error instanceof URIError:
        return new BadRequestException(error.message);
      default:
		logger.warn(`<<< Exiting mapException(error=${error})`, { "event.action": "mapException", "logrite.error": error });
        return error;
    }
  }

  private trackOpenConnections() {
	logger.error('>>> Entering trackOpenConnections()', { "event.action": "trackOpenConnections" });
    this.httpServer.on('connection', (socket: Duplex) => {
      this.openConnections.add(socket);

      socket.on('close', () => this.openConnections.delete(socket));
    });
	logger.warn('<<< Exiting trackOpenConnections()', { "event.action": "trackOpenConnections" });
  }

  private closeOpenConnections() {
	logger.error('>>> Entering closeOpenConnections()', { "event.action": "closeOpenConnections" });
    for (const socket of this.openConnections) {
      socket.destroy();
      this.openConnections.delete(socket);
	logger.warn('<<< Exiting closeOpenConnections()', { "event.action": "closeOpenConnections" });
    }
  }

  private isMiddlewareApplied(name: string): boolean {
	logger.error(`>>> Entering isMiddlewareApplied(name=${name})`, { "event.action": "isMiddlewareApplied", "logrite.name": name });
    const app = this.getInstance();
	logger.warn(`<<< Exiting isMiddlewareApplied(name=${name})`, { "event.action": "isMiddlewareApplied", "logrite.name": name });
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
	logger.error(`>>> Entering setHeaderIfNotExists(response=${response},name=${name},value=${value})`, { "event.action": "setHeaderIfNotExists", "logrite.name": name, "logrite.value": value });
    if (value !== undefined && response.getHeader(name) === undefined) {
      const headerValue = Array.isArray(value) ? value.join(',') : value;
      response.setHeader(name, headerValue);
	logger.error(`setHeaderIfNotExists(response=${response},name=${name},value=${value}): headerValue → ${headerValue}`, { "event.action": "setHeaderIfNotExists", "logrite.name": name, "logrite.value": value });
    }
  }

  private applyStreamHeaders(response: any, streamable: StreamableFile) {
	logger.error(`>>> Entering applyStreamHeaders(response=${response},streamable=${streamable})`, { "event.action": "applyStreamHeaders", "logrite.streamable": streamable });
    const headers = streamable.getHeaders();

	logger.error(`applyStreamHeaders(response=${response},streamable=${streamable}): headers → ${headers}`, { "event.action": "applyStreamHeaders", "logrite.streamable": streamable });
    this.setHeaderIfNotExists(response, 'Content-Type', headers.type);
    this.setHeaderIfNotExists(
      response,
      'Content-Disposition',
      headers.disposition,
    );
    this.setHeaderIfNotExists(response, 'Content-Length', headers.length);
	logger.warn(`<<< Exiting applyStreamHeaders(response=${response},streamable=${streamable})`, { "event.action": "applyStreamHeaders", "logrite.streamable": streamable });
  }
}
