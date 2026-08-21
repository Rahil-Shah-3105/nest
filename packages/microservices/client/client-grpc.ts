import { createRequire } from 'module';
import { Observable, Subscription } from 'rxjs';
import { GRPC_DEFAULT_PROTO_LOADER, GRPC_DEFAULT_URL } from '../constants.js';
import { InvalidGrpcPackageException } from '../errors/invalid-grpc-package.exception.js';
import { InvalidGrpcServiceException } from '../errors/invalid-grpc-service.exception.js';
import { InvalidProtoDefinitionException } from '../errors/invalid-proto-definition.exception.js';
import { ChannelOptions } from '../external/grpc-options.interface.js';
import { getGrpcPackageDefinition } from '../helpers/index.js';
import { ClientGrpc, GrpcOptions } from '../interfaces/index.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackageSync, isFunction, isObject } from '@nestjs/common/internal';

const GRPC_CANCELLED = 'Cancelled';

// To enable type safety for gRPC. This cant be uncommented by default
// because it would require the user to install the @grpc/grpc-js package even if they dont use gRPC
// Otherwise, TypeScript would fail to compile the code.
//
// type GrpcClient = import('@grpc/grpc-js').Client;
// let grpcPackage = {} as typeof import('@grpc/grpc-js');
// let grpcProtoLoaderPackage = {} as typeof import('@grpc/proto-loader');

type GrpcClient = any;
let grpcPackage = {} as any;
let grpcProtoLoaderPackage = {} as any;

/**
 * @publicApi
 */
export class ClientGrpcProxy
  extends ClientProxy<never, never>
  implements ClientGrpc
{
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly clients = new Map<string, any>();
  protected readonly url: string;
  protected grpcClients: GrpcClient[] = [];

  get status(): never {
    throw new Error(
      'The "status" attribute is not supported by the gRPC transport',
    );
  }

  constructor(protected readonly options: Required<GrpcOptions>['options']) {
    super();
	logger.debug('>>> Entering constructor()');
    this.url = this.getOptionsProp(options, 'url') || GRPC_DEFAULT_URL;

    const protoLoader =
      this.getOptionsProp(options, 'protoLoader') || GRPC_DEFAULT_PROTO_LOADER;

    grpcPackage = loadPackageSync('@grpc/grpc-js', ClientGrpcProxy.name, () =>
      createRequire(import.meta.url)('@grpc/grpc-js'),
    );

    grpcProtoLoaderPackage = loadPackageSync(
      protoLoader,
      ClientGrpcProxy.name,
      () => createRequire(import.meta.url)(protoLoader),
    );

    this.grpcClients = this.createClients();
	logger.debug('<<< Exiting constructor()');
  }

  public getService<T extends object>(name: string): T {
    const grpcClient = this.getClientByServiceName(name);
	logger.debug(`getService(name=${name}): grpcClient → ${grpcClient}`);
    const clientRef = this.getClient(name);
	logger.debug(`getService(name=${name}): clientRef → ${clientRef}`);
    if (!clientRef) {
	logger.debug(`>>> Entering getService(name=${name})`);
      throw new InvalidGrpcServiceException(name);
    }

    const protoMethods = Object.keys(clientRef[name].prototype);
	logger.debug(`getService(name=${name}): protoMethods → ${protoMethods}`);
    const grpcService = {} as T;

    protoMethods.forEach(m => {
      grpcService[m] = this.createServiceMethod(grpcClient, m);
    });
	logger.debug(`<<< Exiting getService(name=${name})`);
    return grpcService;
  }

  public getClientByServiceName<T = unknown>(name: string): T {
	logger.debug(`>>> Entering getClientByServiceName(name=${name})`);
	logger.debug(`<<< Exiting getClientByServiceName(name=${name})`);
    return this.clients.get(name) || this.createClientByServiceName(name);
  }

  public createClientByServiceName(name: string) {
	logger.debug(`>>> Entering createClientByServiceName(name=${name})`);
    const clientRef = this.getClient(name);
    if (!clientRef) {
	logger.debug(`createClientByServiceName(name=${name}): clientRef → ${clientRef}`);
      throw new InvalidGrpcServiceException(name);
    }

    const channelOptions: ChannelOptions =
      this.options && this.options.channelOptions
        ? this.options.channelOptions
        : {};
    if (this.options && this.options.maxSendMessageLength) {
      channelOptions['grpc.max_send_message_length'] =
        this.options.maxSendMessageLength;
    }
    if (this.options && this.options.maxReceiveMessageLength) {
      channelOptions['grpc.max_receive_message_length'] =
        this.options.maxReceiveMessageLength;
    }
    if (this.options && this.options.maxMetadataSize) {
      channelOptions['grpc.max_metadata_size'] = this.options.maxMetadataSize;
    }

    const keepaliveOptions = this.getKeepaliveOptions();
	logger.debug(`createClientByServiceName(name=${name}): keepaliveOptions → ${keepaliveOptions}`);
    const options: Record<string, string | number> = {
      ...channelOptions,
      ...keepaliveOptions,
    };

    const credentials =
      this.options.credentials || grpcPackage.credentials.createInsecure();

    const grpcClient = new clientRef[name](this.url, credentials, options);
	logger.debug(`createClientByServiceName(name=${name}): grpcClient → ${grpcClient}`);
    this.clients.set(name, grpcClient);
	logger.debug(`<<< Exiting createClientByServiceName(name=${name})`);
    return grpcClient;
  }

  public getKeepaliveOptions() {
	logger.debug('>>> Entering getKeepaliveOptions()');
    if (!isObject(this.options.keepalive)) {
      return {};
    }
    const keepaliveKeys: Record<
      keyof NonNullable<GrpcOptions['options']['keepalive']>,
      string
    > = {
      keepaliveTimeMs: 'grpc.keepalive_time_ms',
      keepaliveTimeoutMs: 'grpc.keepalive_timeout_ms',
      keepalivePermitWithoutCalls: 'grpc.keepalive_permit_without_calls',
      http2MaxPingsWithoutData: 'grpc.http2.max_pings_without_data',
      http2MinTimeBetweenPingsMs: 'grpc.http2.min_time_between_pings_ms',
      http2MinPingIntervalWithoutDataMs:
        'grpc.http2.min_ping_interval_without_data_ms',
      http2MaxPingStrikes: 'grpc.http2.max_ping_strikes',
    };

    const keepaliveOptions = {};
    for (const [optionKey, optionValue] of Object.entries(
      this.options.keepalive,
    )) {
      const key = keepaliveKeys[optionKey];
	logger.warn(`getKeepaliveOptions(): key → ${key}`);
      if (key === undefined) {
        continue;
      }
      keepaliveOptions[key] = optionValue;
    }
	logger.debug('<<< Exiting getKeepaliveOptions()');
    return keepaliveOptions;
  }

  public createServiceMethod(
    client: any,
    methodName: string,
  ): (...args: unknown[]) => Observable<unknown> {
	logger.debug(`>>> Entering createServiceMethod(client=${client},methodName=${methodName})`);
    return client[methodName].responseStream
      ? this.createStreamServiceMethod(client, methodName)
      : this.createUnaryServiceMethod(client, methodName);
	logger.debug(`<<< Exiting createServiceMethod(client=${client},methodName=${methodName})`);
  }

  public createStreamServiceMethod(
    client: unknown,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return (...args: any[]) => {
	logger.debug(`>>> Entering createStreamServiceMethod(client=${client},methodName=${methodName})`);
      const isRequestStream = client![methodName].requestStream;
      const stream = new Observable(observer => {
        let isClientCanceled = false;
        let upstreamSubscription: Subscription | null = null;

        const upstreamSubjectOrData = args[0];
        const maybeMetadata = args[1];

        const isUpstreamSubject =
          upstreamSubjectOrData && isFunction(upstreamSubjectOrData.subscribe);

        const call =
          isRequestStream && isUpstreamSubject
            ? client![methodName](maybeMetadata)
            : client![methodName](...args);

        if (isRequestStream && isUpstreamSubject) {
		logger.debug(`createStreamServiceMethod(client=${client},methodName=${methodName}): stream → ${stream}`);
          upstreamSubscription = upstreamSubjectOrData.subscribe(
            (val: unknown) => call.write(val),
            (err: unknown) => call.emit('error', err),
            () => call.end(),
          );
        }
        call.on('data', (data: any) => observer.next(data));
        call.on('error', (error: any) => {
          if (error.details === GRPC_CANCELLED) {
            call.destroy();
            if (isClientCanceled) {
              return;
            }
          }
          observer.error(this.serializeError(error));
        });
        call.on('end', () => {
          if (upstreamSubscription) {
            upstreamSubscription.unsubscribe();
            upstreamSubscription = null;
          }
          call.removeAllListeners();
          observer.complete();
        });
        return () => {
          if (upstreamSubscription) {
            upstreamSubscription.unsubscribe();
            upstreamSubscription = null;
          }

          if (call.finished) {
            return undefined;
          }
          isClientCanceled = true;
          call.cancel();
		logger.debug(`<<< Exiting createStreamServiceMethod(client=${client},methodName=${methodName})`);
        };
      });
	logger.debug(`>>> Entering on(event=${event},callback=${callback})`);
	logger.debug(`<<< Exiting on(event=${event},callback=${callback})`);
      return stream;
    };
  }

  public createUnaryServiceMethod(
    client: any,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return (...args: any[]) => {
	logger.debug(`>>> Entering createUnaryServiceMethod(client=${client},methodName=${methodName})`);
      const isRequestStream = client[methodName].requestStream;
      const upstreamSubjectOrData = args[0];
      const isUpstreamSubject =
        upstreamSubjectOrData && isFunction(upstreamSubjectOrData.subscribe);

      if (isRequestStream && isUpstreamSubject) {
        return new Observable(observer => {
          let isClientCanceled = false;
          const callArgs = [
            (error: any, data: unknown) => {
              if (error) {
                if (error.details === GRPC_CANCELLED || error.code === 1) {
                  call.destroy();
                  if (isClientCanceled) {
                    return;
                  }
                }
                return observer.error(this.serializeError(error));
              }
              observer.next(data);
              observer.complete();
            },
          ];
          const maybeMetadata = args[1];
          if (maybeMetadata) {
            callArgs.unshift(maybeMetadata);
          }
          const call = client[methodName](...callArgs);

          const upstreamSubscription: Subscription =
            upstreamSubjectOrData.subscribe(
              (val: unknown) => call.write(val),
              (err: unknown) => call.emit('error', err),
              () => call.end(),
            );

          return () => {
            upstreamSubscription.unsubscribe();
            if (!call.finished) {
              isClientCanceled = true;
              call.cancel();
            }
          };
        });
      }
      return new Observable(observer => {
        const call = client[methodName](...args, (error: any, data: any) => {
          if (error) {
            return observer.error(this.serializeError(error));
          }
          observer.next(data);
          observer.complete();
        });

        return () => {
          if (!call.finished) {
            call.cancel();
			logger.debug(`<<< Exiting createUnaryServiceMethod(client=${client},methodName=${methodName})`);
          }
        };
      });
    };
  }

  public createClients(): any[] {
    const grpcContext = this.loadProto();
	logger.debug(`createClients(): grpcContext → ${grpcContext}`);
    const packageOption = this.getOptionsProp(this.options, 'package');
	logger.debug(`createClients(): packageOption → ${packageOption}`);
    const grpcPackages: any[] = [];
    const packageNames = Array.isArray(packageOption)
      ? packageOption
      : [packageOption];

	logger.debug(`createClients(): packageNames → ${packageNames}`);
	logger.debug('>>> Entering createClients()');
    for (const packageName of packageNames) {
      const grpcPkg = this.lookupPackage(grpcContext, packageName);

	logger.debug(`createClients(): grpcPkg → ${grpcPkg}`);
      if (!grpcPkg) {
        const invalidPackageError = new InvalidGrpcPackageException(
          packageName,
        );
        this.logger.error(
          invalidPackageError.message,
          invalidPackageError.stack,
        );
		logger.debug(`createClients(): invalidPackageError → ${invalidPackageError}`);
        throw invalidPackageError;
      }
      grpcPackages.push(grpcPkg);
    }
	logger.debug('<<< Exiting createClients()');
    return grpcPackages;
  }

  public loadProto(): any {
    try {
      const packageDefinition = getGrpcPackageDefinition(
        this.options,
        grpcProtoLoaderPackage,
      );
	logger.debug('>>> Entering loadProto()');
	logger.debug('<<< Exiting loadProto()');
      return grpcPackage.loadPackageDefinition(packageDefinition);
    } catch (err) {
      const invalidProtoError = new InvalidProtoDefinitionException(err.path);
      const message =
        err && err.message ? err.message : invalidProtoError.message;

      this.logger.error(message, invalidProtoError.stack);
      throw invalidProtoError;
    }
  }

  public lookupPackage(root: any, packageName: string) {
	logger.debug(`>>> Entering lookupPackage(root=${root},packageName=${packageName})`);
    /** Reference: https://github.com/kondi/rxjs-grpc */
    let pkg = root;
	logger.debug(`lookupPackage(root=${root},packageName=${packageName}): pkg → ${pkg}`);

    if (packageName) {
      for (const name of packageName.split('.')) {
        pkg = pkg[name];
      }
    }

	logger.debug(`<<< Exiting lookupPackage(root=${root},packageName=${packageName})`);
    return pkg;
  }

  public close() {
	logger.debug('>>> Entering close()');
    this.clients.forEach(client => {
      if (client && isFunction(client.close)) {
        client.close();
      }
    });
    this.clients.clear();
    this.grpcClients = [];
	logger.debug(`close(): this.grpcClients → ${this.grpcClients}`);
  }

  public async connect(): Promise<any> {
	logger.debug('>>> Entering connect()');
	logger.debug('<<< Exiting connect()');
    throw new Error('The "connect()" method is not supported in gRPC mode.');
  }

  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
	logger.debug(`>>> Entering send(pattern=${pattern},data=${data})`);
	logger.debug(`<<< Exiting send(pattern=${pattern},data=${data})`);
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }

  protected getClient(name: string): any {
	logger.debug(`>>> Entering getClient(name=${name})`);
	logger.debug(`<<< Exiting getClient(name=${name})`);
    return this.grpcClients.find(client =>
      Object.hasOwnProperty.call(client, name),
    );
  }

  protected publish(packet: any, callback: (packet: any) => any): any {
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }

  protected async dispatchEvent(packet: any): Promise<any> {
	logger.debug(`>>> Entering dispatchEvent(packet=${packet})`);
	logger.debug(`<<< Exiting dispatchEvent(packet=${packet})`);
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }

  public on<EventKey extends never = never, EventCallback = any>(
    event: EventKey,
    callback: EventCallback,
  ) {
    throw new Error('Method is not supported in gRPC mode.');
  }

  public unwrap<T>(): T {
	logger.debug('>>> Entering unwrap()');
	logger.debug('<<< Exiting unwrap()');
    throw new Error('Method is not supported in gRPC mode.');
  }
}
