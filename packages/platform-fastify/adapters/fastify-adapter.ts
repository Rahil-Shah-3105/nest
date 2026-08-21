/* eslint-disable @typescript-eslint/no-floating-promises */
import { FastifyCorsOptions } from '@fastify/cors';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  type RawBodyRequest,
  type RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import {
  FastifyBaseLogger,
  FastifyBodyParser,
  FastifyError,
  FastifyInstance,
  FastifyListenOptions,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyRegister,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
  HTTPMethods,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
  RequestGenericInterface,
  RouteGenericInterface,
  RouteOptions,
  RouteShorthandOptions,
  fastify,
} from 'fastify';
import * as Reply from 'fastify/lib/reply.js';
import fastifySymbols from 'fastify/lib/symbols.js';
import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import {
  InjectOptions,
  Chain as LightMyRequestChain,
  Response as LightMyRequestResponse,
} from 'light-my-request';
import { pathToRegexp } from 'path-to-regexp';
import {
  type VersionValue,
  loadPackage,
  isNil,
  isString,
  isUndefined,
} from '@nestjs/common/internal';
import { AbstractHttpAdapter } from '@nestjs/core';
import { LegacyRouteConverter } from '@nestjs/core/internal';
const { kRouteContext } = fastifySymbols;
// Fastify uses `fast-querystring` internally to quickly parse URL query strings.
import { parse as querystringParse } from 'fast-querystring';
import urlSanitizer from 'find-my-way/lib/url-sanitizer.js';
import {
  FASTIFY_ROUTE_CONFIG_METADATA,
  FASTIFY_ROUTE_CONSTRAINTS_METADATA,
  FASTIFY_ROUTE_SCHEMA_METADATA,
} from '../constants.js';
import {
  FastifyStaticOptions,
  FastifyViewOptions,
} from '../interfaces/external/index.js';
import { NestFastifyBodyParserOptions } from '../interfaces/index.js';
import middie from './middie/fastify-middie.js';
const { safeDecodeURI } = urlSanitizer;

type FastifyAdapterBaseOptions<
  Server extends RawServerBase = RawServerDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyServerOptions<Server, Logger> & {
  skipMiddie?: boolean;
};

type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  http2: true;
  https: http2.SecureServerOptions;
};

type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  http2: true;
  http2SessionTimeout?: number;
};

type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  https: https.ServerOptions;
};

type FastifyHttpOptions<
  Server extends http.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  http: http.ServerOptions;
};

type VersionedRoute<TRequest, TResponse> = ((
  req: TRequest,
  res: TResponse,
  next: Function,
) => Function) & {
  version: VersionValue;
  versioningOptions: VersioningOptions;
};

/**
 * The following type assertion is valid as we enforce "middie" plugin registration
 * which enhances the FastifyRequest.RawRequest with the "originalUrl" property.
 * ref https://github.com/fastify/middie/pull/16
 * ref https://github.com/fastify/fastify/pull/559
 */
type FastifyRawRequest<TServer extends RawServerBase> =
  RawRequestDefaultExpression<TServer> & { originalUrl?: string };

/**
 * @publicApi
 */
export class FastifyAdapter<
  TServer extends RawServerBase = RawServerDefault,
  TRawRequest extends FastifyRawRequest<TServer> = FastifyRawRequest<TServer>,
  TRawResponse extends RawReplyDefaultExpression<TServer> =
    RawReplyDefaultExpression<TServer>,
  TRequest extends FastifyRequest<
    RequestGenericInterface,
    TServer,
    TRawRequest
  > = FastifyRequest<RequestGenericInterface, TServer, TRawRequest>,
  TReply extends FastifyReply<
    RouteGenericInterface,
    TServer,
    TRawRequest,
    TRawResponse
  > = FastifyReply<RouteGenericInterface, TServer, TRawRequest, TRawResponse>,
  TInstance extends FastifyInstance<TServer, TRawRequest, TRawResponse> =
    FastifyInstance<TServer, TRawRequest, TRawResponse>,
> extends AbstractHttpAdapter<TServer, TRequest, TReply> {
  protected readonly logger = new Logger(FastifyAdapter.name);
  declare protected readonly instance: TInstance;
  protected _pathPrefix?: string;

  private _isParserRegistered: boolean;
  private onRequestHook?: (
    request: TRequest,
    reply: TReply,
    done: (err?: Error) => void,
  ) => void | Promise<void>;
  private onResponseHook?: (
    request: TRequest,
    reply: TReply,
    done: (err?: Error) => void,
  ) => void | Promise<void>;
  private isMiddieRegistered: boolean;
  private pendingMiddlewares: Array<{ args: any[] }> = [];
  private versioningOptions?: VersioningOptions;
  private readonly versionConstraint = {
    name: 'version',
    validate(value: unknown) {
      if (!isString(value) && !Array.isArray(value)) {
        throw new Error(
          'Version constraint should be a string or an array of strings.',
        );
      }
    },
    storage() {
	logger.debug('>>> Entering storage()');
      const versions = new Map<string, unknown>();
      return {
        get(version: string | Array<string>) {
		logger.debug(`>>> Entering get(version=${version})`);
          if (Array.isArray(version)) {
			logger.debug(`storage(): versions → ${versions}`);
		logger.debug(`<<< Exiting get(version=${version})`);
            return versions.get(version.find(v => versions.has(v))!) || null;
          }
          return versions.get(version) || null;
        },
        set(versionOrVersions: string | Array<string>, store: unknown) {
		logger.debug(`>>> Entering set(versionOrVersions=${versionOrVersions},store=${store})`);
          const storeVersionConstraint = (version: string) =>
            versions.set(version, store);
          if (Array.isArray(versionOrVersions))
            versionOrVersions.forEach(storeVersionConstraint);
          else storeVersionConstraint(versionOrVersions);
		logger.debug(`<<< Exiting set(versionOrVersions=${versionOrVersions},store=${store})`);
        },
        del(version: string | Array<string>) {
		logger.debug(`>>> Entering del(version=${version})`);
          if (Array.isArray(version)) {
            version.forEach(v => versions.delete(v));
          } else {
            versions.delete(version);
			logger.debug(`<<< Exiting del(version=${version})`);
          }
        },
        empty() {
		logger.debug('>>> Entering empty()');
          versions.clear();
		logger.debug('<<< Exiting empty()');
        },
      };
	logger.debug('<<< Exiting storage()');
    },
    deriveConstraint: (req: FastifyRequest) => {
      // Media Type (Accept Header) Versioning Handler
      if (this.versioningOptions?.type === VersioningType.MEDIA_TYPE) {
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined = (req.headers?.[
          MEDIA_TYPE_HEADER
        ] || req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()]) as string;

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : '';

        return isUndefined(acceptHeaderVersionParameter)
          ? VERSION_NEUTRAL // No version was supplied
          : acceptHeaderVersionParameter.split(this.versioningOptions.key)[1];
      }
      // Header Versioning Handler
      else if (this.versioningOptions?.type === VersioningType.HEADER) {
        const customHeaderVersionParameter: string | string[] | undefined =
          req.headers?.[this.versioningOptions.header] ||
          req.headers?.[this.versioningOptions.header.toLowerCase()];

        return isUndefined(customHeaderVersionParameter)
          ? VERSION_NEUTRAL // No version was supplied
          : customHeaderVersionParameter;
      }
      // Custom Versioning Handler
      else if (this.versioningOptions?.type === VersioningType.CUSTOM) {
        return this.versioningOptions.extractor(req);
      }
      return undefined;
    },
    mustMatchWhenDerived: false,
  };

  get isParserRegistered(): boolean {
    return !!this._isParserRegistered;
  }

  constructor(
    instanceOrOptions?:
      | TInstance
      | FastifyHttp2Options<any>
      | FastifyHttp2SecureOptions<any>
      | FastifyHttpsOptions<any>
      | FastifyHttpOptions<any>
      | FastifyAdapterBaseOptions<TServer>,
  ) {
    super();

    const instance =
      instanceOrOptions && (instanceOrOptions as TInstance).server
        ? instanceOrOptions
        : fastify({
            ...(instanceOrOptions as FastifyServerOptions),
            routerOptions: {
              ...(instanceOrOptions as FastifyServerOptions)?.routerOptions,
              constraints: {
                version: this.versionConstraint as any,
              },
            },
          });

    this.setInstance(instance);

    if ((instanceOrOptions as FastifyAdapterBaseOptions)?.skipMiddie) {
      this.isMiddieRegistered = true;
    }

    this.instance.addHook('onRequest', (request, reply, done) => {
      if (this.onRequestHook) {
        this.onRequestHook(request as TRequest, reply as TReply, done);
      } else {
        done();
      }
    });

    this.instance.addHook('onResponse', (request, reply, done) => {
      if (this.onResponseHook) {
        this.onResponseHook(request as TRequest, reply as TReply, done);
      } else {
        done();
      }
    });
  }

  public setOnRequestHook(
    hook: (
      request: TRequest,
      reply: TReply,
      done: (err?: Error) => void,
    ) => void | Promise<void>,
  ) {
	logger.debug(`>>> Entering setOnRequestHook(hook=${hook})`);
    this.onRequestHook = hook;
	logger.debug(`<<< Exiting setOnRequestHook(hook=${hook})`);
  }

  public setOnResponseHook(
    hook: (
      request: TRequest,
      reply: TReply,
      done: (err?: Error) => void,
    ) => void | Promise<void>,
  ) {
	logger.debug(`>>> Entering setOnResponseHook(hook=${hook})`);
    this.onResponseHook = hook;
	logger.debug(`<<< Exiting setOnResponseHook(hook=${hook})`);
  }

  public async init() {
	logger.debug('>>> Entering init()');
    if (this.isMiddieRegistered) {
      return;
    }
    await this.registerMiddie();

    // Register any pending middlewares that were added before init
    if (this.pendingMiddlewares.length > 0) {
      for (const { args } of this.pendingMiddlewares) {
        (this.instance.use as any)(...args);
      }
      this.pendingMiddlewares = [];
	logger.debug(`init(): this.pendingMiddlewares → ${this.pendingMiddlewares}`);
    }
  }

  public listen(port: string | number, callback?: () => void): void;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): void;
  public listen(
    listenOptions: string | number | FastifyListenOptions,
    ...args: any[]
  ): void {
    const isFirstArgTypeofFunction = typeof args[0] === 'function';
    const callback = isFirstArgTypeofFunction ? args[0] : args[1];

    let options: Record<string, any>;
    if (
      typeof listenOptions === 'object' &&
      (listenOptions.host !== undefined ||
        listenOptions.port !== undefined ||
        listenOptions.path !== undefined)
    ) {
	logger.debug(`>>> Entering listen(listenOptions=${listenOptions},args=${args})`);
      // First parameter is an object with a path, port and/or host attributes
      options = listenOptions;
    } else {
      options = {
        port: +listenOptions,
      };
    }
    if (!isFirstArgTypeofFunction) {
      options.host = args[0];
    }
    return this.instance.listen(options, callback);
  }

  public get(...args: any[]) {
    return this.injectRouteOptions('GET', ...args);
  }

  public post(...args: any[]) {
	logger.debug(`>>> Entering post(args=${args})`);
	logger.debug(`<<< Exiting post(args=${args})`);
    return this.injectRouteOptions('POST', ...args);
  }

  public head(...args: any[]) {
	logger.debug(`>>> Entering head(args=${args})`);
	logger.debug(`<<< Exiting head(args=${args})`);
    return this.injectRouteOptions('HEAD', ...args);
  }

  public delete(...args: any[]) {
	logger.debug(`>>> Entering delete(args=${args})`);
	logger.debug(`<<< Exiting delete(args=${args})`);
    return this.injectRouteOptions('DELETE', ...args);
  }

  public put(...args: any[]) {
	logger.debug(`>>> Entering put(args=${args})`);
	logger.debug(`<<< Exiting put(args=${args})`);
    return this.injectRouteOptions('PUT', ...args);
  }

  public patch(...args: any[]) {
	logger.debug(`>>> Entering patch(args=${args})`);
	logger.debug(`<<< Exiting patch(args=${args})`);
    return this.injectRouteOptions('PATCH', ...args);
  }

  public options(...args: any[]) {
	logger.debug(`>>> Entering options(args=${args})`);
	logger.debug(`<<< Exiting options(args=${args})`);
    return this.injectRouteOptions('OPTIONS', ...args);
  }

  public search(...args: any[]) {
	logger.debug('>>> Entering search()');
	logger.debug('<<< Exiting search()');
    return this.injectRouteOptions('SEARCH', ...args);
  }

  public query(...args: any[]) {
	logger.debug('>>> Entering query()');
	logger.debug('<<< Exiting query()');
    return this.injectRouteOptions('QUERY', ...args);
  }

  public propfind(...args: any[]) {
	logger.debug('>>> Entering propfind()');
	logger.debug('<<< Exiting propfind()');
    return this.injectRouteOptions('PROPFIND', ...args);
  }

  public proppatch(...args: any[]) {
	logger.debug('>>> Entering proppatch()');
	logger.debug('<<< Exiting proppatch()');
    return this.injectRouteOptions('PROPPATCH', ...args);
  }

  public mkcol(...args: any[]) {
	logger.debug('>>> Entering mkcol()');
	logger.debug('<<< Exiting mkcol()');
    return this.injectRouteOptions('MKCOL', ...args);
  }

  public copy(...args: any[]) {
	logger.debug('>>> Entering copy()');
	logger.debug('<<< Exiting copy()');
    return this.injectRouteOptions('COPY', ...args);
  }

  public move(...args: any[]) {
	logger.debug('>>> Entering move()');
	logger.debug('<<< Exiting move()');
    return this.injectRouteOptions('MOVE', ...args);
  }

  public lock(...args: any[]) {
	logger.debug('>>> Entering lock()');
	logger.debug('<<< Exiting lock()');
    return this.injectRouteOptions('LOCK', ...args);
  }

  public unlock(...args: any[]) {
	logger.debug('>>> Entering unlock()');
	logger.debug('<<< Exiting unlock()');
    return this.injectRouteOptions('UNLOCK', ...args);
  }

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute<TRequest, TReply> {
    if (!this.versioningOptions) {
	logger.debug(`>>> Entering applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`);
      this.versioningOptions = versioningOptions;
    }
    const versionedRoute = handler as VersionedRoute<TRequest, TReply>;
	logger.debug(`applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions}): this.versioningOptions → ${this.versioningOptions}`);
    versionedRoute.version = version;
	logger.debug(`<<< Exiting applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`);
    return versionedRoute;
  }

  public reply(
    response: TRawResponse | TReply,
    body: any,
    statusCode?: number,
  ) {
	logger.debug(`>>> Entering reply(response=${response},body=${body},statusCode=${statusCode})`);
    const fastifyReply: TReply = this.isNativeResponse(response)
      ? new Reply(
          response,
          {
            [kRouteContext]: {
              preSerialization: null,
              preValidation: [],
              preHandler: [],
              onSend: [],
              onError: [],
            },
          },
          {},
        )
      : response;

    if (!isNil(statusCode)) {
      fastifyReply.status(statusCode);
    }
    if (body instanceof StreamableFile) {
      const streamHeaders = body.getHeaders();
      if (
        fastifyReply.getHeader('Content-Type') === undefined &&
        streamHeaders.type !== undefined
      ) {
		logger.debug(`reply(response=${response},body=${body},statusCode=${statusCode}): streamHeaders → ${streamHeaders}`);
        fastifyReply.header('Content-Type', streamHeaders.type);
      }
      if (
        fastifyReply.getHeader('Content-Disposition') === undefined &&
        streamHeaders.disposition !== undefined
      ) {
        fastifyReply.header('Content-Disposition', streamHeaders.disposition);
      }
      if (
        fastifyReply.getHeader('Content-Length') === undefined &&
        streamHeaders.length !== undefined
      ) {
        fastifyReply.header('Content-Length', streamHeaders.length);
      }
      body = body.getStream();
    }
    if (
      fastifyReply.getHeader('Content-Type') !== undefined &&
      fastifyReply.getHeader('Content-Type') !== 'application/json' &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
      Logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
        FastifyAdapter.name,
      );
      fastifyReply.header('Content-Type', 'application/json');
	logger.debug(`<<< Exiting reply(response=${response},body=${body},statusCode=${statusCode})`);
    }
	logger.debug(`reply(response=${response},body=${body},statusCode=${statusCode}): body → ${body}`);
    return fastifyReply.send(body);
  }

  public status(response: TRawResponse | TReply, statusCode: number) {
	logger.debug(`>>> Entering status(response=${response},statusCode=${statusCode})`);
    if (this.isNativeResponse(response)) {
      response.statusCode = statusCode;
	logger.debug(`status(response=${response},statusCode=${statusCode}): response.statusCode → ${response.statusCode}`);
	logger.debug(`<<< Exiting status(response=${response},statusCode=${statusCode})`);
      return response;
    }
    return (response as { code: Function }).code(statusCode);
  }

  public end(response: TReply, message?: string) {
	logger.debug(`>>> Entering end(response=${response},message=${message})`);
    response.raw.end(message!);
	logger.debug(`<<< Exiting end(response=${response},message=${message})`);
  }

  public render(
    response: TReply & { view: Function },
    view: string,
    options: any,
  ) {
	logger.debug(`<<< Exiting render(response=${response},view=${view},options=${options})`);
    return response && response.view(view, options);
  }

  public redirect(response: TReply, statusCode: number, url: string) {
	logger.debug(`>>> Entering redirect(response=${response},statusCode=${statusCode},url=${url})`);
    const code = statusCode ?? HttpStatus.FOUND;
	logger.debug(`<<< Exiting redirect(response=${response},statusCode=${statusCode},url=${url})`);
    return response.status(code).redirect(url);
  }

  public setErrorHandler(handler: Parameters<TInstance['setErrorHandler']>[0]) {
	logger.debug(`>>> Entering setErrorHandler(handler=${handler})`);
	logger.debug(`<<< Exiting setErrorHandler(handler=${handler})`);
    return this.instance.setErrorHandler(handler);
  }

  public setNotFoundHandler(handler: Function) {
	logger.debug(`>>> Entering setNotFoundHandler(handler=${handler})`);
	logger.debug(`<<< Exiting setNotFoundHandler(handler=${handler})`);
    return this.instance.setNotFoundHandler(handler as any);
  }

  public getHttpServer<T = TServer>(): T {
	logger.debug('>>> Entering getHttpServer()');
	logger.debug('<<< Exiting getHttpServer()');
    return this.instance.server as unknown as T;
  }

  public getInstance<T = TInstance>(): T {
	logger.debug('>>> Entering getInstance()');
	logger.debug('<<< Exiting getInstance()');
    return this.instance as unknown as T;
  }

  public register<
    TRegister extends Parameters<
      FastifyRegister<FastifyInstance<TServer, TRawRequest, TRawResponse>>
    >,
  >(plugin: TRegister['0'], opts?: TRegister['1']) {
	logger.debug(`>>> Entering register(plugin=${plugin},opts=${opts})`);
	logger.debug(`<<< Exiting register(plugin=${plugin},opts=${opts})`);
    return (this.instance.register as any)(plugin, opts);
  }

  public inject(): LightMyRequestChain;
  public inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  public inject(
    opts?: InjectOptions | string,
  ): LightMyRequestChain | Promise<LightMyRequestResponse> {
	logger.debug(`>>> Entering inject(opts=${opts})`);
	logger.debug(`<<< Exiting inject(opts=${opts})`);
    return this.instance.inject(opts!);
  }

  public async close() {
	logger.debug('>>> Entering close()');
    try {
      return await this.instance.close();
    } catch (err) {
	logger.error('Exception in close():', (err as Error).message, err);
      // Check if server is still running
      if (err.code !== 'ERR_SERVER_NOT_RUNNING') {
	logger.debug('<<< Exiting close()');
        throw err;
      }
      return;
    }
  }

  public initHttpServer() {
	logger.debug('>>> Entering initHttpServer()');
    this.httpServer = this.instance.server;
	logger.debug(`initHttpServer(): this.httpServer → ${this.httpServer}`);
  }

  public async useStaticAssets(options: FastifyStaticOptions) {
	logger.debug(`>>> Entering useStaticAssets(options=${options})`);
	logger.debug(`<<< Exiting useStaticAssets(options=${options})`);
    return this.register(
      await loadPackage(
        '@fastify/static',
        'FastifyAdapter.useStaticAssets()',
        () => import('@fastify/static'),
      ),
      options,
    );
  }

  public async setViewEngine(options: FastifyViewOptions | string) {
	logger.debug(`>>> Entering setViewEngine(options=${options})`);
    if (isString(options)) {
      new Logger('FastifyAdapter').error(
        "setViewEngine() doesn't support a string argument.",
      );
	logger.debug(`<<< Exiting setViewEngine(options=${options})`);
      process.exit(1);
    }
    return this.register(
      await loadPackage(
        '@fastify/view',
        'FastifyAdapter.setViewEngine()',
        () => import('@fastify/view'),
      ),
      options,
    );
  }

  public isHeadersSent(response: TReply): boolean {
	logger.debug(`>>> Entering isHeadersSent(response=${response})`);
	logger.debug(`<<< Exiting isHeadersSent(response=${response})`);
    return response.sent;
  }

  public getHeader(response: any, name: string) {
	logger.debug(`>>> Entering getHeader(response=${response},name=${name})`);
	logger.debug(`<<< Exiting getHeader(response=${response},name=${name})`);
    return response.getHeader(name);
  }

  public setHeader(response: TReply, name: string, value: string) {
	logger.debug(`>>> Entering setHeader(response=${response},name=${name},value=${value})`);
	logger.debug(`<<< Exiting setHeader(response=${response},name=${name},value=${value})`);
    return response.header(name, value);
  }

  public appendHeader(response: any, name: string, value: string) {
	logger.debug(`>>> Entering appendHeader(response=${response},name=${name},value=${value})`);
    response.header(name, value);
	logger.debug(`<<< Exiting appendHeader(response=${response},name=${name},value=${value})`);
  }

  public getRequestHostname(request: TRequest): string {
	logger.debug(`>>> Entering getRequestHostname(request=${request})`);
	logger.debug(`<<< Exiting getRequestHostname(request=${request})`);
    return request.hostname;
  }

  public getRequestMethod(request: TRequest): string {
	logger.debug(`>>> Entering getRequestMethod(request=${request})`);
	logger.debug(`<<< Exiting getRequestMethod(request=${request})`);
    return request.raw ? request.raw.method! : request.method;
  }

  public getRequestUrl(request: TRequest): string;
  public getRequestUrl(request: TRawRequest): string;
  public getRequestUrl(request: TRequest & TRawRequest): string {
	logger.debug(`>>> Entering getRequestUrl(request=${request})`);
	logger.debug(`<<< Exiting getRequestUrl(request=${request})`);
    return this.getRequestOriginalUrl(request.raw || request);
  }

  public enableCors(options?: FastifyCorsOptions) {
	logger.debug(`>>> Entering enableCors(options=${options})`);
    this.register(
      import('@fastify/cors') as unknown as Parameters<
        TInstance['register']
      >[0],
      options,
    );
	logger.debug(`<<< Exiting enableCors(options=${options})`);
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
	logger.debug(`>>> Entering registerParserMiddleware(prefix=${prefix},rawBody=${rawBody})`);
    if (this._isParserRegistered) {
      return;
    }

    this.registerUrlencodedContentParser(rawBody);
    this.registerJsonContentParser(rawBody);

    this._isParserRegistered = true;
    this._pathPrefix = prefix
      ? !prefix.startsWith('/')
        ? `/${prefix}`
        : prefix
      : undefined;
	logger.debug(`<<< Exiting registerParserMiddleware(prefix=${prefix},rawBody=${rawBody})`);
  }

  public useBodyParser(
    type: string | string[] | RegExp,
    rawBody: boolean,
    options?: NestFastifyBodyParserOptions,
    parser?: FastifyBodyParser<Buffer, TServer>,
  ) {
    const parserOptions = {
      ...(options || {}),
      parseAs: 'buffer' as const,
    };

    this.getInstance().addContentTypeParser<Buffer>(
      type,
      parserOptions,
      (
        req: RawBodyRequest<FastifyRequest<any, TServer, TRawRequest>>,
        body: Buffer,
        done,
      ) => {
        if (rawBody === true && Buffer.isBuffer(body)) {
          req.rawBody = body;
        }

        if (parser) {
          parser(req, body, done);
          return;
        }

        done(null, body);
      },
    );

    // To avoid the Nest application init to override our custom
    // body parser, we mark the parsers as registered.
    this._isParserRegistered = true;
  }

  public async createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): Promise<(path: string, callback: Function) => any> {
    if (!this.isMiddieRegistered) {
	logger.debug(`>>> Entering createMiddlewareFactory(requestMethod=${requestMethod})`);
      await this.registerMiddie();
    }
    return (path: string, callback: Function) => {
      const hasEndOfStringCharacter = path.endsWith('$');
	logger.debug(`createMiddlewareFactory(requestMethod=${requestMethod}): hasEndOfStringCharacter → ${hasEndOfStringCharacter}`);
      path = hasEndOfStringCharacter ? path.slice(0, -1) : path;

      let normalizedPath = LegacyRouteConverter.tryConvert(path);
	logger.debug(`createMiddlewareFactory(requestMethod=${requestMethod}): normalizedPath → ${normalizedPath}`);

      // Fallback to "*path" to support plugins like GraphQL
      normalizedPath = normalizedPath === '/*path' ? '*path' : normalizedPath;

      // Normalize the path to support the prefix if it set in application
      if (
        this._pathPrefix &&
        !normalizedPath.startsWith(this._pathPrefix) &&
        (normalizedPath === '/' || normalizedPath === '')
      ) {
        normalizedPath = `${this._pathPrefix}${normalizedPath}`;
        if (normalizedPath.endsWith('/')) {
          normalizedPath = `${normalizedPath}{*path}`;
        }
      }

      try {
        let { regexp: re } = pathToRegexp(normalizedPath);
        re = hasEndOfStringCharacter
          ? new RegExp(re.source + '$', re.flags)
          : re;

        // The following type assertion is valid as we use import('@fastify/middie') rather than require('@fastify/middie')
        // ref https://github.com/fastify/middie/pull/55
        this.instance.use(
          normalizedPath,
          (req: any, res: any, next: Function) => {
            const queryParamsIndex = req.originalUrl.indexOf('?');
            let pathname =
              queryParamsIndex >= 0
                ? req.originalUrl.slice(0, queryParamsIndex)
                : req.originalUrl;

            pathname = this.sanitizeUrl(pathname);

            if (normalizedPath) {
              const pathToCheck = pathname.endsWith('/')
                ? pathname
                : `${pathname}/`;
              if (!re.exec(pathToCheck)) {
                return next();
              }
            }
			logger.debug('>>> Entering use()');
			logger.debug('<<< Exiting use()');
            return callback(req, res, next);
          },
        );
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
		logger.debug(`<<< Exiting createMiddlewareFactory(requestMethod=${requestMethod})`);
        throw e;
      }
    };
  }

  public getType(): string {
	logger.debug('>>> Entering getType()');
	logger.debug('<<< Exiting getType()');
    return 'fastify';
  }

  public isRouteOrderSensitive(): boolean {
	logger.debug('>>> Entering isRouteOrderSensitive()');
	logger.debug('<<< Exiting isRouteOrderSensitive()');
    return false;
  }

  public use(...args: any[]) {
    // Fastify requires @fastify/middie plugin to be registered before middleware can be used.
    // If middie is not registered yet, we queue the middleware and register it later during init.
    if (!this.isMiddieRegistered) {
      this.pendingMiddlewares.push({ args });
      return this;
    }
    return (this.instance.use as any)(...args);
  }

  public mapException(error: unknown): unknown {
    if (this.isHttpFastifyError(error)) {
	logger.debug(`>>> Entering mapException(error=${error})`);
	logger.debug(`<<< Exiting mapException(error=${error})`);
      return new HttpException(error.message, error.statusCode);
    }

    return error;
  }

  private isHttpFastifyError(
    error: any,
  ): error is Error & { statusCode: number } {
	logger.debug(`>>> Entering isHttpFastifyError(error=${error})`);
    // condition based on this code - https://github.com/fastify/fastify-error/blob/d669b150a82968322f9f7be992b2f6b463272de3/index.js#L22
	logger.debug(`<<< Exiting isHttpFastifyError(error=${error})`);
    return (
      error.statusCode !== undefined &&
      error instanceof Error &&
      error.name === 'FastifyError'
    );
  }

  protected registerWithPrefix(
    factory:
      | FastifyPluginCallback<any>
      | FastifyPluginAsync<any>
      | Promise<{ default: FastifyPluginCallback<any> }>
      | Promise<{ default: FastifyPluginAsync<any> }>,
    prefix = '/',
  ) {
	logger.debug(`>>> Entering registerWithPrefix(factory=${factory},prefix=${prefix})`);
	logger.debug(`<<< Exiting registerWithPrefix(factory=${factory},prefix=${prefix})`);
    return this.instance.register(factory, { prefix });
  }

  private isNativeResponse(
    response: TRawResponse | TReply,
  ): response is TRawResponse {
	logger.debug(`>>> Entering isNativeResponse(response=${response})`);
	logger.debug(`<<< Exiting isNativeResponse(response=${response})`);
    return !('status' in response);
  }

  private registerJsonContentParser(rawBody?: boolean) {
	logger.debug(`>>> Entering registerJsonContentParser(rawBody=${rawBody})`);
    const contentType = 'application/json';
    const withRawBody = !!rawBody;
	logger.debug(`registerJsonContentParser(rawBody=${rawBody}): contentType → ${contentType}`);
    const { bodyLimit } = this.getInstance().initialConfig;

    this.useBodyParser(
      contentType,
      withRawBody,
      { bodyLimit },
      (req, body, done) => {
        const { onProtoPoisoning, onConstructorPoisoning } =
          this.instance.initialConfig;
        const defaultJsonParser = this.instance.getDefaultJsonParser(
          onProtoPoisoning || 'error',
          onConstructorPoisoning || 'error',
        ) as FastifyBodyParser<string | Buffer, TServer>;
        defaultJsonParser(req, body, done);
		logger.debug(`<<< Exiting registerJsonContentParser(rawBody=${rawBody})`);
      },
    );
  }

  private registerUrlencodedContentParser(rawBody?: boolean) {
	logger.debug(`>>> Entering registerUrlencodedContentParser(rawBody=${rawBody})`);
    const contentType = 'application/x-www-form-urlencoded';
    const withRawBody = !!rawBody;
	logger.debug(`registerUrlencodedContentParser(rawBody=${rawBody}): contentType → ${contentType}`);
    const { bodyLimit } = this.getInstance().initialConfig;

    this.useBodyParser(
      contentType,
      withRawBody,
      { bodyLimit },
      (_req, body, done) => {
        done(null, querystringParse(body.toString()));
		logger.debug(`<<< Exiting registerUrlencodedContentParser(rawBody=${rawBody})`);
      },
    );
  }

  private async registerMiddie() {
	logger.debug('>>> Entering registerMiddie()');
    this.isMiddieRegistered = true;
    await this.register(
      middie as unknown as Parameters<TInstance['register']>[0],
    );
	logger.debug(`registerMiddie(): this.isMiddieRegistered → ${this.isMiddieRegistered}`);
  }

  private getRequestOriginalUrl(rawRequest: TRawRequest) {
	logger.debug(`>>> Entering getRequestOriginalUrl(rawRequest=${rawRequest})`);
	logger.debug(`<<< Exiting getRequestOriginalUrl(rawRequest=${rawRequest})`);
    return rawRequest.originalUrl || rawRequest.url!;
  }

  private injectRouteOptions(
    routerMethodKey: Uppercase<HTTPMethods>,
    ...args: any[]
  ) {
	logger.debug(`>>> Entering injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args})`);
    const handlerRef = args[args.length - 1];
    const isVersioned =
      !isUndefined(handlerRef.version) &&
      handlerRef.version !== VERSION_NEUTRAL;
    const routeConfig = Reflect.getMetadata(
      FASTIFY_ROUTE_CONFIG_METADATA,
      handlerRef,
    );

    const routeConstraints = Reflect.getMetadata(
      FASTIFY_ROUTE_CONSTRAINTS_METADATA,
      handlerRef,
    );

    const routeSchema = Reflect.getMetadata(
      FASTIFY_ROUTE_SCHEMA_METADATA,
      handlerRef,
    );

    const hasConfig = !isUndefined(routeConfig);
	logger.debug(`injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args}): hasConfig → ${hasConfig}`);
    const hasConstraints = !isUndefined(routeConstraints);
	logger.debug(`injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args}): hasConstraints → ${hasConstraints}`);
    const hasSchema = !isUndefined(routeSchema);
	logger.debug(`injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args}): hasSchema → ${hasSchema}`);
    const routeToInject: RouteOptions<TServer, TRawRequest, TRawResponse> &
      RouteShorthandOptions = {
      method: routerMethodKey,
      url: args[0],
      handler: handlerRef,
    };

    if (!this.instance.supportedMethods.includes(routerMethodKey)) {
      this.instance.addHttpMethod(routerMethodKey, { hasBody: true });
    }

    if (isVersioned || hasConstraints || hasConfig || hasSchema) {
      const isPathAndRouteTuple = args.length === 2;
      if (isPathAndRouteTuple) {
        const constraints = {
          ...(hasConstraints && routeConstraints),
          ...(isVersioned && {
            version: handlerRef.version,
          }),
        };

        const options = {
          constraints,
          ...(hasConfig && {
            config: {
              ...routeConfig,
            },
          }),
          ...(hasSchema && {
            schema: routeSchema,
          }),
        };

        const routeToInjectWithOptions = { ...routeToInject, ...options };

        return this.instance.route(routeToInjectWithOptions);
      }
    }
	logger.debug(`<<< Exiting injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args})`);
    return this.instance.route(routeToInject);
  }

  private sanitizeUrl(url: string): string {
    const initialConfig = this.instance.initialConfig as FastifyServerOptions;
    const routerOptions =
      initialConfig.routerOptions as Partial<FastifyServerOptions>;

    if (
      routerOptions.ignoreDuplicateSlashes ||
      initialConfig.ignoreDuplicateSlashes
    ) {
	logger.debug(`>>> Entering sanitizeUrl(url=${url})`);
      url = this.removeDuplicateSlashes(url);
    }

    if (
      routerOptions.ignoreTrailingSlash ||
      initialConfig.ignoreTrailingSlash
    ) {
      url = this.trimLastSlash(url);
    }

    if (
      routerOptions.caseSensitive === false ||
      initialConfig.caseSensitive === false
    ) {
      url = url.toLowerCase();
    }
	logger.debug(`sanitizeUrl(url=${url}): url → ${url}`);
    return safeDecodeURI(
      url,
      routerOptions.useSemicolonDelimiter ||
        initialConfig.useSemicolonDelimiter,
    ).path;
  }

  private removeDuplicateSlashes(path: string) {
	logger.debug(`>>> Entering removeDuplicateSlashes(path=${path})`);
    const REMOVE_DUPLICATE_SLASHES_REGEXP = /\/\/+/g;
	logger.debug(`<<< Exiting removeDuplicateSlashes(path=${path})`);
    return path.indexOf('//') !== -1
      ? path.replace(REMOVE_DUPLICATE_SLASHES_REGEXP, '/')
      : path;
  }

  private trimLastSlash(path: string) {
	logger.debug(`>>> Entering trimLastSlash(path=${path})`);
    if (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
	logger.debug(`<<< Exiting trimLastSlash(path=${path})`);
      return path.slice(0, -1);
    }
    return path;
  }
}
