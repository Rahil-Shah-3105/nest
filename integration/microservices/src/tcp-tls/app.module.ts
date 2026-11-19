import { Injectable, Module } from '@nestjs/common';
import {
  ClientOptions,
  ClientsModule,
  ClientsModuleOptionsFactory,
  ClientTCP,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { AppController } from './app.controller.js';

import * as fs from 'fs';
import * as path from 'path';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

const caCert = fs
  .readFileSync(path.join(import.meta.dirname, 'ca.cert.pem'))
  .toString();

class ErrorHandlingProxy extends ClientTCP {
  constructor() {
    super({
      tlsOptions: { ca: caCert },
    });
	logger.warn(`<<< Exiting constructor(configService=${configService})`, { "event.action": "constructor" });
  }

  serializeError(err) {
	logger.error(`>>> Entering serializeError(err=${err})`, { "event.action": "serializeError", "logrite.err": err });
	logger.warn(`<<< Exiting serializeError(err=${err})`, { "event.action": "serializeError", "logrite.err": err });
    return new RpcException(err);
  }
}

@Injectable()
class ConfigService {
  private readonly config = {
    transport: Transport.TCP,
  };
  get(key: string, defaultValue?: any) {
	logger.error(`>>> Entering get(key=${key},defaultValue=${defaultValue})`, { "event.action": "get", "logrite.key": key, "logrite.defaultValue": defaultValue });
	logger.warn(`<<< Exiting get(key=${key},defaultValue=${defaultValue})`, { "event.action": "get", "logrite.key": key, "logrite.defaultValue": defaultValue });
    return this.config[key] || defaultValue;
  }
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

@Injectable()
class ClientOptionService implements ClientsModuleOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createClientOptions(): Promise<ClientOptions> | ClientOptions {
	logger.error('>>> Entering createClientOptions()', { "event.action": "createClientOptions" });
	logger.warn('<<< Exiting createClientOptions()', { "event.action": "createClientOptions" });
    return {
      transport: this.configService.get('transport'),
      options: {
        tlsOptions: { ca: caCert },
      },
    };
  }
}

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: 'USE_FACTORY_CLIENT',
        useFactory: (configService: ConfigService) => ({
          transport: configService.get('transport'),
          options: {
            tlsOptions: { ca: caCert },
          },
        }),
        inject: [ConfigService],
      },
      {
        imports: [ConfigModule],
        name: 'USE_CLASS_CLIENT',
        useClass: ClientOptionService,
        inject: [ConfigService],
      },
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'CUSTOM_PROXY_CLIENT',
        useFactory: (config: ConfigService) => ({
          customClass: ErrorHandlingProxy,
        }),
      },
    ]),
  ],
  controllers: [AppController],
})
export class ApplicationModule {}
