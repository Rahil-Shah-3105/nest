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
	logger.error('>>> Entering storage()', { "event.action": "storage" });
      const versions = new Map<string, unknown>();
      return {
        get(version: string | Array<string>) {
		logger.error(`>>> Entering get(version=${version})`, { "event.action": "get", "logrite.version": version });
          if (Array.isArray(version)) {
			logger.error(`storage(): versions → ${versions}`, { "event.action": "storage" });
            return versions.get(version.find(v => versions.has(v))!) || null;
          }
		logger.warn(`<<< Exiting get(version=${version})`, { "event.action": "get", "logrite.version": version });
          return versions.get(version) || null;
        },
        set(versionOrVersions: string | Array<string>, store: unknown) {
		logger.error(`>>> Entering set(versionOrVersions=${versionOrVersions},store=${store})`, { "event.action": "set", "logrite.versionOrVersions": versionOrVersions, "logrite.store": store });
          const storeVersionConstraint = (version: string) =>
            versions.set(version, store);
          if (Array.isArray(versionOrVersions))
            versionOrVersions.forEach(storeVersionConstraint);
          else storeVersionConstraint(versionOrVersions);
		logger.warn(`<<< Exiting set(versionOrVersions=${versionOrVersions},store=${store})`, { "event.action": "set", "logrite.versionOrVersions": versionOrVersions, "logrite.store": store });
        },
        del(version: string | Array<string>) {
		logger.error(`>>> Entering del(version=${version})`, { "event.action": "del", "logrite.version": version });
          if (Array.isArray(version)) {
            version.forEach(v => versions.delete(v));
          } else {
            versions.delete(version);
			logger.warn(`<<< Exiting del(version=${version})`, { "event.action": "del", "logrite.version": version });
          }
        },
        empty() {
		logger.error('>>> Entering empty()', { "event.action": "empty" });
          versions.clear();
		logger.warn('<<< Exiting empty()', { "event.action": "empty" });
        },
      };
	logger.warn('<<< Exiting storage()', { "event.action": "storage" });
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
	logger.error(`>>> Entering setOnRequestHook(hook=${hook})`, { "event.action": "setOnRequestHook", "logrite.hook": hook });
    this.onRequestHook = hook;
	logger.warn(`<<< Exiting setOnRequestHook(hook=${hook})`, { "event.action": "setOnRequestHook", "logrite.hook": hook });
  }

  public setOnResponseHook(
    hook: (
      request: TRequest,
      reply: TReply,
      done: (err?: Error) => void,
    ) => void | Promise<void>,
  ) {
	logger.error(`>>> Entering setOnResponseHook(hook=${hook})`, { "event.action": "setOnResponseHook", "logrite.hook": hook });
    this.onResponseHook = hook;
	logger.warn(`<<< Exiting setOnResponseHook(hook=${hook})`, { "event.action": "setOnResponseHook", "logrite.hook": hook });
  }

  public async init() {
	logger.error('>>> Entering init()', { "event.action": "init" });
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
	logger.debug(`init(): this.pendingMiddlewares → ${this.pendingMiddlewares}`, { "event.action": "init" });
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
	logger.error(`>>> Entering listen(listenOptions=${listenOptions},args=${args})`, { "event.action": "listen", "logrite.listenOptions": listenOptions });
    const isFirstArgTypeofFunction = typeof args[0] === 'function';
    const callback = isFirstArgTypeofFunction ? args[0] : args[1];
	logger.error(`listen(listenOptions=${listenOptions},args=${args}): isFirstArgTypeofFunction → ${isFirstArgTypeofFunction}`, { "event.action": "listen", "logrite.listenOptions": listenOptions });

    let options: Record<string, any>;
    if (
      typeof listenOptions === 'object' &&
      (listenOptions.host !== undefined ||
        listenOptions.port !== undefined ||
        listenOptions.path !== undefined)
    ) {
      // First parameter is an object with a path, port and/or host attributes
      options = listenOptions;
    } else {
      options = {
        port: +listenOptions,
      };
    }
    if (!isFirstArgTypeofFunction) {
      options.host = args[0];
	logger.warn(`<<< Exiting listen(listenOptions=${listenOptions},args=${args})`, { "event.action": "listen", "logrite.listenOptions": listenOptions });
    }
    return this.instance.listen(options, callback);
  }

  public get(...args: any[]) {
    return this.injectRouteOptions('GET', ...args);
  }

  public post(...args: any[]) {
	logger.error(`>>> Entering post(args=${args})`, { "event.action": "post" });
	logger.warn(`<<< Exiting post(args=${args})`, { "event.action": "post" });
    return this.injectRouteOptions('POST', ...args);
  }

  public head(...args: any[]) {
	logger.error(`>>> Entering head(args=${args})`, { "event.action": "head" });
	logger.warn(`<<< Exiting head(args=${args})`, { "event.action": "head" });
    return this.injectRouteOptions('HEAD', ...args);
  }

  public delete(...args: any[]) {
	logger.error(`>>> Entering delete(args=${args})`, { "event.action": "delete" });
	logger.warn(`<<< Exiting delete(args=${args})`, { "event.action": "delete" });
    return this.injectRouteOptions('DELETE', ...args);
  }

  public put(...args: any[]) {
	logger.error(`>>> Entering put(args=${args})`, { "event.action": "put" });
	logger.warn(`<<< Exiting put(args=${args})`, { "event.action": "put" });
    return this.injectRouteOptions('PUT', ...args);
  }

  public patch(...args: any[]) {
	logger.error(`>>> Entering patch(args=${args})`, { "event.action": "patch" });
	logger.warn(`<<< Exiting patch(args=${args})`, { "event.action": "patch" });
    return this.injectRouteOptions('PATCH', ...args);
  }

  public options(...args: any[]) {
	logger.error(`>>> Entering options(args=${args})`, { "event.action": "options" });
	logger.warn(`<<< Exiting options(args=${args})`, { "event.action": "options" });
    return this.injectRouteOptions('OPTIONS', ...args);
  }

  public search(...args: any[]) {
	logger.error(`>>> Entering search(args=${args})`, { "event.action": "search" });
	logger.warn(`<<< Exiting search(args=${args})`, { "event.action": "search" });
    return this.injectRouteOptions('SEARCH', ...args);
  }

  public query(...args: any[]) {
	logger.error(`>>> Entering query(args=${args})`, { "event.action": "query" });
	logger.warn(`<<< Exiting query(args=${args})`, { "event.action": "query" });
    return this.injectRouteOptions('QUERY', ...args);
  }

  public propfind(...args: any[]) {
	logger.error(`>>> Entering propfind(args=${args})`, { "event.action": "propfind" });
	logger.warn(`<<< Exiting propfind(args=${args})`, { "event.action": "propfind" });
    return this.injectRouteOptions('PROPFIND', ...args);
  }

  public proppatch(...args: any[]) {
	logger.error(`>>> Entering proppatch(args=${args})`, { "event.action": "proppatch" });
	logger.warn(`<<< Exiting proppatch(args=${args})`, { "event.action": "proppatch" });
    return this.injectRouteOptions('PROPPATCH', ...args);
  }

  public mkcol(...args: any[]) {
	logger.error(`>>> Entering mkcol(args=${args})`, { "event.action": "mkcol" });
	logger.warn(`<<< Exiting mkcol(args=${args})`, { "event.action": "mkcol" });
    return this.injectRouteOptions('MKCOL', ...args);
  }

  public copy(...args: any[]) {
	logger.error(`>>> Entering copy(args=${args})`, { "event.action": "copy" });
	logger.warn(`<<< Exiting copy(args=${args})`, { "event.action": "copy" });
    return this.injectRouteOptions('COPY', ...args);
  }

  public move(...args: any[]) {
	logger.error(`>>> Entering move(args=${args})`, { "event.action": "move" });
	logger.warn(`<<< Exiting move(args=${args})`, { "event.action": "move" });
    return this.injectRouteOptions('MOVE', ...args);
  }

  public lock(...args: any[]) {
	logger.error(`>>> Entering lock(args=${args})`, { "event.action": "lock" });
	logger.warn(`<<< Exiting lock(args=${args})`, { "event.action": "lock" });
    return this.injectRouteOptions('LOCK', ...args);
  }

  public unlock(...args: any[]) {
	logger.error(`>>> Entering unlock(args=${args})`, { "event.action": "unlock" });
	logger.warn(`<<< Exiting unlock(args=${args})`, { "event.action": "unlock" });
    return this.injectRouteOptions('UNLOCK', ...args);
  }

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute<TRequest, TReply> {
	logger.error(`>>> Entering applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`, { "event.action": "applyVersionFilter", "logrite.handler": handler, "logrite.version": version, "logrite.versioningOptions": versioningOptions });
    if (!this.versioningOptions) {
      this.versioningOptions = versioningOptions;
	logger.debug(`applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions}): this.versioningOptions → ${this.versioningOptions}`, { "event.action": "applyVersionFilter", "logrite.handler": handler, "logrite.version": version, "logrite.versioningOptions": versioningOptions });
    }
    const versionedRoute = handler as VersionedRoute<TRequest, TReply>;
    versionedRoute.version = version;
	logger.debug(`applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions}): versionedRoute.version → ${versionedRoute.version}`, { "event.action": "applyVersionFilter", "logrite.handler": handler, "logrite.version": version, "logrite.versioningOptions": versioningOptions });
	logger.warn(`<<< Exiting applyVersionFilter(handler=${handler},version=${version},versioningOptions=${versioningOptions})`, { "event.action": "applyVersionFilter", "logrite.handler": handler, "logrite.version": version, "logrite.versioningOptions": versioningOptions });
    return versionedRoute;
  }

  public reply(
    response: TRawResponse | TReply,
    body: any,
    statusCode?: number,
  ) {
	logger.error(`>>> Entering reply(response=${response},body=${body},statusCode=${statusCode})`, { "event.action": "reply", "logrite.statusCode": statusCode });
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
		logger.error(`reply(response=${response},body=${body},statusCode=${statusCode}): streamHeaders → ${streamHeaders}`, { "event.action": "reply", "logrite.statusCode": statusCode });
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
	logger.warn(`<<< Exiting reply(response=${response},body=${body},statusCode=${statusCode})`, { "event.action": "reply", "logrite.statusCode": statusCode });
    }
	logger.error(`reply(response=${response},body=${body},statusCode=${statusCode}): body → ${body}`, { "event.action": "reply", "logrite.statusCode": statusCode });
    return fastifyReply.send(body);
  }

  public status(response: TRawResponse | TReply, statusCode: number) {
	logger.error(`>>> Entering status(response=${response},statusCode=${statusCode})`, { "event.action": "status", "logrite.statusCode": statusCode });
    if (this.isNativeResponse(response)) {
      response.statusCode = statusCode;
	logger.debug(`status(response=${response},statusCode=${statusCode}): response.statusCode → ${response.statusCode}`, { "event.action": "status", "logrite.statusCode": statusCode });
      return response;
    }
	logger.warn(`<<< Exiting status(response=${response},statusCode=${statusCode})`, { "event.action": "status", "logrite.statusCode": statusCode });
    return (response as { code: Function }).code(statusCode);
  }

  public end(response: TReply, message?: string) {
	logger.error(`>>> Entering end(response=${response},message=${message})`, { "event.action": "end", "logrite.message": message });
    response.raw.end(message!);
	logger.warn(`<<< Exiting end(response=${response},message=${message})`, { "event.action": "end", "logrite.message": message });
  }

  public render(
    response: TReply & { view: Function },
    view: string,
    options: any,
  ) {
    return response && response.view(view, options);
  }

  public redirect(response: TReply, statusCode: number, url: string) {
	logger.error(`>>> Entering redirect(response=${response},statusCode=${statusCode},url=${url})`, { "event.action": "redirect", "logrite.statusCode": statusCode, "logrite.url": url });
    const code = statusCode ?? HttpStatus.FOUND;
	logger.warn(`<<< Exiting redirect(response=${response},statusCode=${statusCode},url=${url})`, { "event.action": "redirect", "logrite.statusCode": statusCode, "logrite.url": url });
    return response.status(code).redirect(url);
  }

  public setErrorHandler(handler: Parameters<TInstance['setErrorHandler']>[0]) {
	logger.error(`>>> Entering setErrorHandler(handler=${handler})`, { "event.action": "setErrorHandler", "logrite.handler": handler });
	logger.warn(`<<< Exiting setErrorHandler(handler=${handler})`, { "event.action": "setErrorHandler", "logrite.handler": handler });
    return this.instance.setErrorHandler(handler);
  }

  public setNotFoundHandler(handler: Function) {
	logger.error(`>>> Entering setNotFoundHandler(handler=${handler})`, { "event.action": "setNotFoundHandler", "logrite.handler": handler });
	logger.warn(`<<< Exiting setNotFoundHandler(handler=${handler})`, { "event.action": "setNotFoundHandler", "logrite.handler": handler });
    return this.instance.setNotFoundHandler(handler as any);
  }

  public getHttpServer<T = TServer>(): T {
	logger.error('>>> Entering getHttpServer()', { "event.action": "getHttpServer" });
	logger.warn('<<< Exiting getHttpServer()', { "event.action": "getHttpServer" });
    return this.instance.server as unknown as T;
  }

  public getInstance<T = TInstance>(): T {
	logger.error('>>> Entering getInstance()', { "event.action": "getInstance" });
	logger.warn('<<< Exiting getInstance()', { "event.action": "getInstance" });
    return this.instance as unknown as T;
  }

  public register<
    TRegister extends Parameters<
      FastifyRegister<FastifyInstance<TServer, TRawRequest, TRawResponse>>
    >,
  >(plugin: TRegister['0'], opts?: TRegister['1']) {
	logger.error(`>>> Entering register(plugin=${plugin},opts=${opts})`, { "event.action": "register", "logrite.plugin": plugin, "logrite.opts": opts });
	logger.warn(`<<< Exiting register(plugin=${plugin},opts=${opts})`, { "event.action": "register", "logrite.plugin": plugin, "logrite.opts": opts });
    return (this.instance.register as any)(plugin, opts);
  }

  public inject(): LightMyRequestChain;
  public inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  public inject(
    opts?: InjectOptions | string,
  ): LightMyRequestChain | Promise<LightMyRequestResponse> {
	logger.error(`>>> Entering inject(opts=${opts})`, { "event.action": "inject", "logrite.opts": opts });
	logger.warn(`<<< Exiting inject(opts=${opts})`, { "event.action": "inject", "logrite.opts": opts });
    return this.instance.inject(opts!);
  }

  public async close() {
	logger.error('>>> Entering close()', { "event.action": "close" });
    try {
      return await this.instance.close();
    } catch (err) {
	logger.error('Exception in close():', (err as Error).message, err, { "event.action": "close", "event.category": "process" });
      // Check if server is still running
      if (err.code !== 'ERR_SERVER_NOT_RUNNING') {
        throw err;
      }
	logger.warn('<<< Exiting close()', { "event.action": "close" });
      return;
    }
  }

  public initHttpServer() {
	logger.error('>>> Entering initHttpServer()', { "event.action": "initHttpServer" });
    this.httpServer = this.instance.server;
	logger.debug(`initHttpServer(): this.httpServer → ${this.httpServer}`, { "event.action": "initHttpServer" });
  }

  public async useStaticAssets(options: FastifyStaticOptions) {
	logger.error(`>>> Entering useStaticAssets(options=${options})`, { "event.action": "useStaticAssets", "logrite.options": options });
	logger.warn(`<<< Exiting useStaticAssets(options=${options})`, { "event.action": "useStaticAssets", "logrite.options": options });
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
	logger.error(`>>> Entering setViewEngine(options=${options})`, { "event.action": "setViewEngine", "logrite.options": options });
    if (isString(options)) {
      new Logger('FastifyAdapter').error(
        "setViewEngine() doesn't support a string argument.",
      );
      process.exit(1);
    }
	logger.warn(`<<< Exiting setViewEngine(options=${options})`, { "event.action": "setViewEngine", "logrite.options": options });
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
	logger.error(`>>> Entering isHeadersSent(response=${response})`, { "event.action": "isHeadersSent" });
	logger.warn(`<<< Exiting isHeadersSent(response=${response})`, { "event.action": "isHeadersSent" });
    return response.sent;
  }

  public getHeader(response: any, name: string) {
	logger.error(`>>> Entering getHeader(response=${response},name=${name})`, { "event.action": "getHeader", "logrite.name": name });
	logger.warn(`<<< Exiting getHeader(response=${response},name=${name})`, { "event.action": "getHeader", "logrite.name": name });
    return response.getHeader(name);
  }

  public setHeader(response: TReply, name: string, value: string) {
	logger.error(`>>> Entering setHeader(response=${response},name=${name},value=${value})`, { "event.action": "setHeader", "logrite.name": name, "logrite.value": value });
	logger.warn(`<<< Exiting setHeader(response=${response},name=${name},value=${value})`, { "event.action": "setHeader", "logrite.name": name, "logrite.value": value });
    return response.header(name, value);
  }

  public appendHeader(response: any, name: string, value: string) {
	logger.error(`>>> Entering appendHeader(response=${response},name=${name},value=${value})`, { "event.action": "appendHeader", "logrite.name": name, "logrite.value": value });
    response.header(name, value);
	logger.warn(`<<< Exiting appendHeader(response=${response},name=${name},value=${value})`, { "event.action": "appendHeader", "logrite.name": name, "logrite.value": value });
  }

  public getRequestHostname(request: TRequest): string {
	logger.error(`>>> Entering getRequestHostname(request=${request})`, { "event.action": "getRequestHostname" });
	logger.warn(`<<< Exiting getRequestHostname(request=${request})`, { "event.action": "getRequestHostname" });
    return request.hostname;
  }

  public getRequestMethod(request: TRequest): string {
	logger.error(`>>> Entering getRequestMethod(request=${request})`, { "event.action": "getRequestMethod" });
	logger.warn(`<<< Exiting getRequestMethod(request=${request})`, { "event.action": "getRequestMethod" });
    return request.raw ? request.raw.method! : request.method;
  }

  public getRequestUrl(request: TRequest): string;
  public getRequestUrl(request: TRawRequest): string;
  public getRequestUrl(request: TRequest & TRawRequest): string {
	logger.error(`>>> Entering getRequestUrl(request=${request})`, { "event.action": "getRequestUrl" });
	logger.warn(`<<< Exiting getRequestUrl(request=${request})`, { "event.action": "getRequestUrl" });
    return this.getRequestOriginalUrl(request.raw || request);
  }

  public enableCors(options?: FastifyCorsOptions) {
	logger.error(`>>> Entering enableCors(options=${options})`, { "event.action": "enableCors", "logrite.options": options });
    this.register(
      import('@fastify/cors') as unknown as Parameters<
        TInstance['register']
      >[0],
      options,
    );
	logger.warn(`<<< Exiting enableCors(options=${options})`, { "event.action": "enableCors", "logrite.options": options });
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
	logger.error(`>>> Entering registerParserMiddleware(prefix=${prefix},rawBody=${rawBody})`, { "event.action": "registerParserMiddleware", "logrite.prefix": prefix, "logrite.rawBody": rawBody });
    if (this._isParserRegistered) {
      return;
    }

    this.registerUrlencodedContentParser(rawBody);
    this.registerJsonContentParser(rawBody);

    this._isParserRegistered = true;
	logger.debug(`registerParserMiddleware(prefix=${prefix},rawBody=${rawBody}): this._isParserRegistered → ${this._isParserRegistered}`, { "event.action": "registerParserMiddleware", "logrite.prefix": prefix, "logrite.rawBody": rawBody });
    this._pathPrefix = prefix
      ? !prefix.startsWith('/')
        ? `/${prefix}`
        : prefix
      : undefined;
	logger.warn(`<<< Exiting registerParserMiddleware(prefix=${prefix},rawBody=${rawBody})`, { "event.action": "registerParserMiddleware", "logrite.prefix": prefix, "logrite.rawBody": rawBody });
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
	logger.error(`>>> Entering createMiddlewareFactory(requestMethod=${requestMethod})`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });
    if (!this.isMiddieRegistered) {
      await this.registerMiddie();
    }
    return (path: string, callback: Function) => {
      const hasEndOfStringCharacter = path.endsWith('$');
	logger.error(`createMiddlewareFactory(requestMethod=${requestMethod}): hasEndOfStringCharacter → ${hasEndOfStringCharacter}`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });
      path = hasEndOfStringCharacter ? path.slice(0, -1) : path;
	logger.error(`createMiddlewareFactory(requestMethod=${requestMethod}): path → ${path}`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });

      let normalizedPath = LegacyRouteConverter.tryConvert(path);
	logger.error(`createMiddlewareFactory(requestMethod=${requestMethod}): normalizedPath → ${normalizedPath}`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });
	logger.debug(`createMiddlewareFactory(requestMethod=${requestMethod}): path → ${path}`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });

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
			logger.error(`>>> Entering use(args=${args})`, { "event.action": "use" });
			logger.warn(`<<< Exiting use(args=${args})`, { "event.action": "use" });
            return callback(req, res, next);
          },
        );
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
        throw e;
      }
    };
	logger.warn(`<<< Exiting createMiddlewareFactory(requestMethod=${requestMethod})`, { "event.action": "createMiddlewareFactory", "logrite.requestMethod": requestMethod });
  }

  public getType(): string {
	logger.error('>>> Entering getType()', { "event.action": "getType" });
	logger.warn('<<< Exiting getType()', { "event.action": "getType" });
    return 'fastify';
  }

  public isRouteOrderSensitive(): boolean {
	logger.error('>>> Entering isRouteOrderSensitive()', { "event.action": "isRouteOrderSensitive" });
	logger.warn('<<< Exiting isRouteOrderSensitive()', { "event.action": "isRouteOrderSensitive" });
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
	logger.error(`>>> Entering mapException(error=${error})`, { "event.action": "mapException", "logrite.error": error });
    if (this.isHttpFastifyError(error)) {
      return new HttpException(error.message, error.statusCode);
    }

	logger.warn(`<<< Exiting mapException(error=${error})`, { "event.action": "mapException", "logrite.error": error });
    return error;
  }

  private isHttpFastifyError(
    error: any,
  ): error is Error & { statusCode: number } {
	logger.error(`>>> Entering isHttpFastifyError(error=${error})`, { "event.action": "isHttpFastifyError", "logrite.error": error });
    // condition based on this code - https://github.com/fastify/fastify-error/blob/d669b150a82968322f9f7be992b2f6b463272de3/index.js#L22
	logger.warn(`<<< Exiting isHttpFastifyError(error=${error})`, { "event.action": "isHttpFastifyError", "logrite.error": error });
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
	logger.error(`>>> Entering registerWithPrefix(factory=${factory},prefix=${prefix})`, { "event.action": "registerWithPrefix", "logrite.factory": factory, "logrite.prefix": prefix });
	logger.warn(`<<< Exiting registerWithPrefix(factory=${factory},prefix=${prefix})`, { "event.action": "registerWithPrefix", "logrite.factory": factory, "logrite.prefix": prefix });
    return this.instance.register(factory, { prefix });
  }

  private isNativeResponse(
    response: TRawResponse | TReply,
  ): response is TRawResponse {
	logger.error(`>>> Entering isNativeResponse(response=${response})`, { "event.action": "isNativeResponse" });
	logger.warn(`<<< Exiting isNativeResponse(response=${response})`, { "event.action": "isNativeResponse" });
    return !('status' in response);
  }

  private registerJsonContentParser(rawBody?: boolean) {
	logger.error(`>>> Entering registerJsonContentParser(rawBody=${rawBody})`, { "event.action": "registerJsonContentParser", "logrite.rawBody": rawBody });
    const contentType = 'application/json';
    const withRawBody = !!rawBody;
	logger.error(`registerJsonContentParser(rawBody=${rawBody}): contentType → ${contentType}`, { "event.action": "registerJsonContentParser", "logrite.rawBody": rawBody });
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
		logger.warn(`<<< Exiting registerJsonContentParser(rawBody=${rawBody})`, { "event.action": "registerJsonContentParser", "logrite.rawBody": rawBody });
      },
    );
  }

  private registerUrlencodedContentParser(rawBody?: boolean) {
	logger.error(`>>> Entering registerUrlencodedContentParser(rawBody=${rawBody})`, { "event.action": "registerUrlencodedContentParser", "logrite.rawBody": rawBody });
    const contentType = 'application/x-www-form-urlencoded';
    const withRawBody = !!rawBody;
	logger.error(`registerUrlencodedContentParser(rawBody=${rawBody}): contentType → ${contentType}`, { "event.action": "registerUrlencodedContentParser", "logrite.rawBody": rawBody });
    const { bodyLimit } = this.getInstance().initialConfig;

    this.useBodyParser(
      contentType,
      withRawBody,
      { bodyLimit },
      (_req, body, done) => {
        done(null, querystringParse(body.toString()));
		logger.warn(`<<< Exiting registerUrlencodedContentParser(rawBody=${rawBody})`, { "event.action": "registerUrlencodedContentParser", "logrite.rawBody": rawBody });
      },
    );
  }

  private async registerMiddie() {
	logger.error('>>> Entering registerMiddie()', { "event.action": "registerMiddie" });
    this.isMiddieRegistered = true;
    await this.register(
      middie as unknown as Parameters<TInstance['register']>[0],
    );
	logger.debug(`registerMiddie(): this.isMiddieRegistered → ${this.isMiddieRegistered}`, { "event.action": "registerMiddie" });
  }

  private getRequestOriginalUrl(rawRequest: TRawRequest) {
	logger.error(`>>> Entering getRequestOriginalUrl(rawRequest=${rawRequest})`, { "event.action": "getRequestOriginalUrl" });
	logger.warn(`<<< Exiting getRequestOriginalUrl(rawRequest=${rawRequest})`, { "event.action": "getRequestOriginalUrl" });
    return rawRequest.originalUrl || rawRequest.url!;
  }

  private injectRouteOptions(
    routerMethodKey: Uppercase<HTTPMethods>,
    ...args: any[]
  ) {
	logger.error(`>>> Entering injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args})`, { "event.action": "injectRouteOptions", "logrite.routerMethodKey": routerMethodKey });
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
	logger.error(`injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args}): hasConfig → ${hasConfig}`, { "event.action": "injectRouteOptions", "logrite.routerMethodKey": routerMethodKey });
    const hasConstraints = !isUndefined(routeConstraints);
	logger.error(`injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args}): hasConstraints → ${hasConstraints}`, { "event.action": "injectRouteOptions", "logrite.routerMethodKey": routerMethodKey });
    const hasSchema = !isUndefined(routeSchema);
	logger.error(`injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args}): hasSchema → ${hasSchema}`, { "event.action": "injectRouteOptions", "logrite.routerMethodKey": routerMethodKey });
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
	logger.warn(`<<< Exiting injectRouteOptions(routerMethodKey=${routerMethodKey},args=${args})`, { "event.action": "injectRouteOptions", "logrite.routerMethodKey": routerMethodKey });
    return this.instance.route(routeToInject);
  }

  private sanitizeUrl(url: string): string {
	logger.error(`>>> Entering sanitizeUrl(url=${url})`, { "event.action": "sanitizeUrl", "logrite.url": url });
    const initialConfig = this.instance.initialConfig as FastifyServerOptions;
    const routerOptions =
      initialConfig.routerOptions as Partial<FastifyServerOptions>;

    if (
      routerOptions.ignoreDuplicateSlashes ||
      initialConfig.ignoreDuplicateSlashes
    ) {
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
	logger.error(`sanitizeUrl(url=${url}): url → ${url}`, { "event.action": "sanitizeUrl", "logrite.url": url });
    return safeDecodeURI(
      url,
      routerOptions.useSemicolonDelimiter ||
        initialConfig.useSemicolonDelimiter,
    ).path;
  }

  private removeDuplicateSlashes(path: string) {
	logger.error(`>>> Entering removeDuplicateSlashes(path=${path})`, { "event.action": "removeDuplicateSlashes", "logrite.path": path });
    const REMOVE_DUPLICATE_SLASHES_REGEXP = /\/\/+/g;
	logger.warn(`<<< Exiting removeDuplicateSlashes(path=${path})`, { "event.action": "removeDuplicateSlashes", "logrite.path": path });
    return path.indexOf('//') !== -1
      ? path.replace(REMOVE_DUPLICATE_SLASHES_REGEXP, '/')
      : path;
  }

  private trimLastSlash(path: string) {
	logger.error(`>>> Entering trimLastSlash(path=${path})`, { "event.action": "trimLastSlash", "logrite.path": path });
    if (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
      return path.slice(0, -1);
    }
	logger.warn(`<<< Exiting trimLastSlash(path=${path})`, { "event.action": "trimLastSlash", "logrite.path": path });
    return path;
  }
}
