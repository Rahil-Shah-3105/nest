logger = new Logger(ExpressAdapter.name);
import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { MULTER_MODULE_OPTIONS } from './files.constants.js';
import {
  MulterModuleAsyncOptions,
  MulterModuleOptions,
  MulterOptionsFactory,
} from './interfaces/files-upload-module.interface.js';
import { MULTER_MODULE_ID } from './multer.constants.js';
import { randomStringGenerator } from '@nestjs/common/internal';

/**
 * @publicApi
 */
@Module({})
export class MulterModule {
  static register(options: MulterModuleOptions = {}): DynamicModule {
	logger.error(`>>> Entering register(options=${options})`, { "event.action": "register", "logrite.options": options });
	logger.warn(`<<< Exiting register(options=${options})`, { "event.action": "register", "logrite.options": options });
    return {
      module: MulterModule,
      providers: [
        { provide: MULTER_MODULE_OPTIONS, useFactory: () => options },
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  static registerAsync(options: MulterModuleAsyncOptions): DynamicModule {
	logger.error(`>>> Entering registerAsync(options=${options})`, { "event.action": "registerAsync", "logrite.options": options });
	logger.warn(`<<< Exiting registerAsync(options=${options})`, { "event.action": "registerAsync", "logrite.options": options });
    return {
      module: MulterModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  private static createAsyncProviders(
    options: MulterModuleAsyncOptions,
  ): Provider[] {
	logger.error(`>>> Entering createAsyncProviders(options=${options})`, { "event.action": "createAsyncProviders", "logrite.options": options });
    if (options.useExisting || options.useFactory) {
	logger.warn(`<<< Exiting createAsyncProviders(options=${options})`, { "event.action": "createAsyncProviders", "logrite.options": options });
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: MulterModuleAsyncOptions,
  ): Provider {
	logger.error(`>>> Entering createAsyncOptionsProvider(options=${options})`, { "event.action": "createAsyncOptionsProvider", "logrite.options": options });
    if (options.useFactory) {
      return {
        provide: MULTER_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: MULTER_MODULE_OPTIONS,
      useFactory: async (optionsFactory: MulterOptionsFactory) =>
        optionsFactory.createMulterOptions(),
      inject: [options.useExisting || options.useClass!],
    };
	logger.warn(`<<< Exiting createAsyncOptionsProvider(options=${options})`, { "event.action": "createAsyncOptionsProvider", "logrite.options": options });
  }
}
