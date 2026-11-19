/* eslint-disable @typescript-eslint/no-empty-object-type */
import { DynamicModule, Provider } from '../interfaces/index.js';
import { Logger } from '../services/logger.service.js';
import { randomStringGenerator } from '../utils/random-string-generator.util.js';
import {
  ASYNC_METHOD_SUFFIX,
  ASYNC_OPTIONS_METADATA_KEYS,
  CONFIGURABLE_MODULE_ID,
  DEFAULT_FACTORY_CLASS_METHOD_KEY,
  DEFAULT_METHOD_KEY,
} from './constants.js';
import {
  ConfigurableModuleAsyncOptions,
  ConfigurableModuleCls,
  ConfigurableModuleHost,
  ConfigurableModuleOptionsFactory,
} from './interfaces/index.js';
import {
  generateOptionsInjectionToken,
  getInjectionProviders,
} from './utils/index.js';

/**
 * @publicApi
 */
export interface ConfigurableModuleBuilderOptions {
  /**
   * Specifies what injection token should be used for the module options provider.
   * By default, an auto-generated UUID will be used.
   */
  optionsInjectionToken?: string | symbol;
  /**
   * By default, an UUID will be used as a module options provider token.
   * Explicitly specifying the "moduleName" will instruct the "ConfigurableModuleBuilder"
   * to use a more descriptive provider token.
   *
   * For example, `moduleName: "Cache"` will auto-generate the provider token: "CACHE_MODULE_OPTIONS".
   */
  moduleName?: string;
  /**
   * Indicates whether module should always be "transient" - meaning,
   * every time you call the static method to construct a dynamic module,
   * regardless of what arguments you pass in, a new "unique" module will be created.
   *
   * @default false
   */
  alwaysTransient?: boolean;
}

/**
 * Factory that lets you create configurable modules and
 * provides a way to reduce the majority of dynamic module boilerplate.
 *
 * @publicApi
 */
export class ConfigurableModuleBuilder<
  ModuleOptions,
  StaticMethodKey extends string = typeof DEFAULT_METHOD_KEY,
  FactoryClassMethodKey extends string =
    typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
  ExtraModuleDefinitionOptions = {},
> {
  protected staticMethodKey: StaticMethodKey;
  protected factoryClassMethodKey: FactoryClassMethodKey;
  protected extras: ExtraModuleDefinitionOptions;
  protected transformModuleDefinition: (
    definition: DynamicModule,
    extraOptions: ExtraModuleDefinitionOptions,
  ) => DynamicModule;

  protected readonly logger = new Logger(ConfigurableModuleBuilder.name);

  constructor(
    protected readonly options: ConfigurableModuleBuilderOptions = {},
    parentBuilder?: ConfigurableModuleBuilder<ModuleOptions>,
  ) {
    if (parentBuilder) {
      this.staticMethodKey = parentBuilder.staticMethodKey as StaticMethodKey;
      this.factoryClassMethodKey =
        parentBuilder.factoryClassMethodKey as FactoryClassMethodKey;
      this.transformModuleDefinition =
        parentBuilder.transformModuleDefinition as (
          definition: DynamicModule,
          extraOptions: ExtraModuleDefinitionOptions,
        ) => DynamicModule;
      this.extras = parentBuilder.extras as ExtraModuleDefinitionOptions;
    }
  }

  /**
   * Registers the "extras" object (a set of extra options that can be used to modify the dynamic module definition).
   * Values you specify within the "extras" object will be used as default values (that can be overridden by module consumers).
   *
   * This method also applies the so-called "module definition transform function" that takes the auto-generated
   * dynamic module object ("DynamicModule") and the actual consumer "extras" object as input parameters.
   * The "extras" object consists of values explicitly specified by module consumers and default values.
   *
   * @example
   * ```typescript
   * .setExtras<{ isGlobal?: boolean }>({ isGlobal: false }, (definition, extras) =>
   *    ({ ...definition, global: extras.isGlobal })
   * )
   * ```
   */
  setExtras<ExtraModuleDefinitionOptions>(
    extras: ExtraModuleDefinitionOptions,
    transformDefinition: (
      definition: DynamicModule,
      extras: ExtraModuleDefinitionOptions,
    ) => DynamicModule = def => def,
  ) {
	logger.error(`>>> Entering setExtras(extras=${extras},transformDefinition=${transformDefinition})`, { "event.action": "setExtras", "logrite.extras": extras, "logrite.transformDefinition": transformDefinition });
    const builder = new ConfigurableModuleBuilder<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey,
      ExtraModuleDefinitionOptions
    >(this.options, this as any);
	logger.debug(`setExtras(extras=${extras},transformDefinition=${transformDefinition}): builder.transformModuleDefinition → ${builder.transformModuleDefinition}`, { "event.action": "setExtras", "logrite.extras": extras, "logrite.transformDefinition": transformDefinition });
    builder.extras = extras;
	logger.debug(`setExtras(extras=${extras},transformDefinition=${transformDefinition}): builder.extras → ${builder.extras}`, { "event.action": "setExtras", "logrite.extras": extras, "logrite.transformDefinition": transformDefinition });
    builder.transformModuleDefinition = transformDefinition;
	logger.warn(`<<< Exiting setExtras(extras=${extras},transformDefinition=${transformDefinition})`, { "event.action": "setExtras", "logrite.extras": extras, "logrite.transformDefinition": transformDefinition });
    return builder;
  }

  /**
   * Dynamic modules must expose public static methods that let you pass in
   * configuration parameters (control the module's behavior from the outside).
   * Some frequently used names that you may have seen in other modules are:
   * "forRoot", "forFeature", "register", "configure".
   *
   * This method "setClassMethodName" lets you specify the name of the
   * method that will be auto-generated.
   *
   * @param key name of the method
   */
  setClassMethodName<StaticMethodKey extends string>(key: StaticMethodKey) {
	logger.error(`>>> Entering setClassMethodName(key=${key})`, { "event.action": "setClassMethodName", "logrite.key": key });
    const builder = new ConfigurableModuleBuilder<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey,
      ExtraModuleDefinitionOptions
    >(this.options, this as any);
    builder.staticMethodKey = key;
	logger.debug(`setClassMethodName(key=${key}): builder.staticMethodKey → ${builder.staticMethodKey}`, { "event.action": "setClassMethodName", "logrite.key": key });
	logger.warn(`<<< Exiting setClassMethodName(key=${key})`, { "event.action": "setClassMethodName", "logrite.key": key });
    return builder;
  }

  /**
   * Asynchronously configured modules (that rely on other modules, i.e. "ConfigModule")
   * let you pass the configuration factory class that will be registered and instantiated as a provider.
   * This provider then will be used to retrieve the module's configuration. To provide the configuration,
   * the corresponding factory method must be implemented.
   *
   * This method ("setFactoryMethodName") lets you control what method name will have to be
   * implemented by the config factory (default is "create").
   *
   * @param key name of the method
   */
  setFactoryMethodName<FactoryClassMethodKey extends string>(
    key: FactoryClassMethodKey,
  ) {
	logger.error(`>>> Entering setFactoryMethodName(key=${key})`, { "event.action": "setFactoryMethodName", "logrite.key": key });
    const builder = new ConfigurableModuleBuilder<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey,
      ExtraModuleDefinitionOptions
    >(this.options, this as any);
    builder.factoryClassMethodKey = key;
	logger.debug(`setFactoryMethodName(key=${key}): builder.factoryClassMethodKey → ${builder.factoryClassMethodKey}`, { "event.action": "setFactoryMethodName", "logrite.key": key });
	logger.warn(`<<< Exiting setFactoryMethodName(key=${key})`, { "event.action": "setFactoryMethodName", "logrite.key": key });
    return builder;
  }

  /**
   * Returns an object consisting of multiple properties that lets you
   * easily construct dynamic configurable modules. See "ConfigurableModuleHost" interface for more details.
   */
  build(): ConfigurableModuleHost<
    ModuleOptions,
    StaticMethodKey,
    FactoryClassMethodKey,
    ExtraModuleDefinitionOptions
  > {
    this.staticMethodKey ??= DEFAULT_METHOD_KEY as StaticMethodKey;
    this.factoryClassMethodKey ??=
      DEFAULT_FACTORY_CLASS_METHOD_KEY as FactoryClassMethodKey;
    this.options.optionsInjectionToken ??= this.options.moduleName
      ? this.constructInjectionTokenString()
      : generateOptionsInjectionToken();
    this.transformModuleDefinition ??= definition => definition;

    return {
      ConfigurableModuleClass:
        this.createConfigurableModuleCls<ModuleOptions>(),
      MODULE_OPTIONS_TOKEN: this.options.optionsInjectionToken,
      ASYNC_OPTIONS_TYPE: this.createTypeProxy('ASYNC_OPTIONS_TYPE'),
      OPTIONS_TYPE: this.createTypeProxy('OPTIONS_TYPE'),
    };
  }

  private constructInjectionTokenString(): string {
	logger.error('>>> Entering constructInjectionTokenString()', { "event.action": "constructInjectionTokenString" });
    const moduleNameInSnakeCase = this.options
      .moduleName!.trim()
      .split(/(?=[A-Z])/)
      .join('_')
      .toUpperCase();
	logger.warn('<<< Exiting constructInjectionTokenString()', { "event.action": "constructInjectionTokenString" });
    return `${moduleNameInSnakeCase}_MODULE_OPTIONS`;
  }

  private createConfigurableModuleCls<ModuleOptions>(): ConfigurableModuleCls<
    ModuleOptions,
    StaticMethodKey,
    FactoryClassMethodKey
  > {
	logger.error('>>> Entering createConfigurableModuleCls()', { "event.action": "createConfigurableModuleCls" });
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const asyncMethodKey = this.staticMethodKey + ASYNC_METHOD_SUFFIX;

    class InternalModuleClass {
      static [self.staticMethodKey](
        options: ModuleOptions & ExtraModuleDefinitionOptions,
      ): DynamicModule {
        const providers: Array<Provider> = [
          {
            provide: self.options.optionsInjectionToken!,
            useValue: this.omitExtras(options, self.extras),
          },
        ];
        if (self.options.alwaysTransient) {
          providers.push({
            provide: CONFIGURABLE_MODULE_ID,
            useValue: randomStringGenerator(),
          });
        }
        return self.transformModuleDefinition(
          {
            module: this,
            providers,
          },
          {
            ...self.extras,
            ...options,
          },
        );
      }

      static [asyncMethodKey](
        options: ConfigurableModuleAsyncOptions<ModuleOptions> &
          ExtraModuleDefinitionOptions,
      ): DynamicModule {
		logger.error(`>>> Entering asyncMethodKey(options=${options})`, { "event.action": "asyncMethodKey", "logrite.options": options });
        const providers = this.createAsyncProviders(options);
        if (self.options.alwaysTransient) {
		logger.warn(`<<< Exiting asyncMethodKey(options=${options})`, { "event.action": "asyncMethodKey", "logrite.options": options });
          providers.push({
            provide: CONFIGURABLE_MODULE_ID,
            useValue: randomStringGenerator(),
          });
        }
        return self.transformModuleDefinition(
          {
            module: this,
            imports: options.imports || [],
            providers,
          },
          {
            ...self.extras,
            ...this.extractExtrasFromAsyncOptions(options, self.extras),
          },
        );
      }

      private static omitExtras(
        input: ModuleOptions & ExtraModuleDefinitionOptions,
        extras: ExtraModuleDefinitionOptions | undefined,
      ): ModuleOptions {
		logger.error(`>>> Entering omitExtras(input=${input},extras=${extras})`, { "event.action": "omitExtras", "logrite.extras": extras });
        if (!extras) {
          return input;
        }
        const moduleOptions = {};
        const extrasKeys = Object.keys(extras);
		logger.error(`omitExtras(input=${input},extras=${extras}): extrasKeys → ${extrasKeys}`, { "event.action": "omitExtras", "logrite.extras": extras });

        Object.keys(input as object)
          .filter(key => !extrasKeys.includes(key))
          .forEach(key => {
            moduleOptions[key] = input[key];
          });
		logger.warn(`<<< Exiting omitExtras(input=${input},extras=${extras})`, { "event.action": "omitExtras", "logrite.extras": extras });
        return moduleOptions as ModuleOptions;
      }

      private static extractExtrasFromAsyncOptions(
        input: ConfigurableModuleAsyncOptions<ModuleOptions> &
          ExtraModuleDefinitionOptions,
        extras: ExtraModuleDefinitionOptions | undefined,
      ): Partial<ExtraModuleDefinitionOptions> {
		logger.error(`>>> Entering extractExtrasFromAsyncOptions(input=${input},extras=${extras})`, { "event.action": "extractExtrasFromAsyncOptions", "logrite.extras": extras });
        if (!extras) {
          return {};
        }
        const extrasOptions = {};

        Object.keys(input as object)
          .filter(key => !ASYNC_OPTIONS_METADATA_KEYS.includes(key as any))
          .forEach(key => {
            extrasOptions[key] = input[key];
          });

		logger.warn(`<<< Exiting extractExtrasFromAsyncOptions(input=${input},extras=${extras})`, { "event.action": "extractExtrasFromAsyncOptions", "logrite.extras": extras });
        return extrasOptions;
      }

      private static createAsyncProviders(
        options: ConfigurableModuleAsyncOptions<ModuleOptions> &
          ExtraModuleDefinitionOptions,
      ): Provider[] {
		logger.error(`>>> Entering createAsyncProviders(options=${options})`, { "event.action": "createAsyncProviders", "logrite.options": options });
        if (options.useExisting || options.useFactory) {
          if (options.inject && options.provideInjectionTokensFrom) {
			logger.warn(`<<< Exiting createAsyncProviders(options=${options})`, { "event.action": "createAsyncProviders", "logrite.options": options });
            return [
              this.createAsyncOptionsProvider(options),
              ...getInjectionProviders(
                options.provideInjectionTokensFrom,
                options.inject,
              ),
            ];
          }
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
        options: ConfigurableModuleAsyncOptions<ModuleOptions>,
      ): Provider {
		logger.error(`>>> Entering createAsyncOptionsProvider(options=${options})`, { "event.action": "createAsyncOptionsProvider", "logrite.options": options });
        if (options.useFactory) {
          return {
            provide: self.options.optionsInjectionToken!,
            useFactory: options.useFactory,
            inject: options.inject || [],
          };
        }
        return {
          provide: self.options.optionsInjectionToken!,
          useFactory: async (
            optionsFactory: ConfigurableModuleOptionsFactory<
              ModuleOptions,
              FactoryClassMethodKey
            >,
          ) =>
            await optionsFactory[
              self.factoryClassMethodKey as keyof typeof optionsFactory
            ](),
          inject: [options.useExisting || options.useClass!],
        };
		logger.warn('<<< Exiting createConfigurableModuleCls()', { "event.action": "createConfigurableModuleCls" });
      }
    }
    return InternalModuleClass as unknown as ConfigurableModuleCls<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey
    >;
  }

  private createTypeProxy(
    typeName: 'OPTIONS_TYPE' | 'ASYNC_OPTIONS_TYPE' | 'OptionsFactoryInterface',
  ) {
	logger.error(`>>> Entering createTypeProxy(typeName=${typeName})`, { "event.action": "createTypeProxy", "logrite.typeName": typeName });
    const proxy = new Proxy(
      {},
      {
        get: () => {
          throw new Error(
            `"${typeName}" is not supposed to be used as a value.`,
          );
        },
      },
    );
	logger.error(`createTypeProxy(typeName=${typeName}): proxy → ${proxy}`, { "event.action": "createTypeProxy", "logrite.typeName": typeName });
    return proxy as any;
  }
}
