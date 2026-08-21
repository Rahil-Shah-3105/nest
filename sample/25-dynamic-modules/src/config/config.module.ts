const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service.js';
import { CONFIG_OPTIONS } from './constants.js';

export interface ConfigModuleOptions {
  folder: string;
}

@Module({})
export class ConfigModule {
  static register(options: ConfigModuleOptions): DynamicModule {
	logger.debug(`>>> Entering register(options=${options})`);
	logger.debug(`<<< Exiting register(options=${options})`);
    return {
      module: ConfigModule,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}
