import { createHash } from 'crypto';
import _stringify from 'fast-safe-stringify';
import { ModuleOpaqueKeyFactory } from './interfaces/module-opaque-key-factory.interface.js';
import { type DynamicModule, type Type, Logger } from '@nestjs/common';
import {
  randomStringGenerator,
  isFunction,
  isSymbol,
} from '@nestjs/common/internal';
// CJS interop: fast-safe-stringify sets module.exports.default = module.exports
const stringify = ((_stringify as any).default ?? _stringify) as unknown as (
  value: any,
  replacer?: (key: string, value: any) => any,
  space?: string | number,
) => string;

const CLASS_STR = 'class ';
const CLASS_STR_LEN = CLASS_STR.length;

export class DeepHashedModuleOpaqueKeyFactory implements ModuleOpaqueKeyFactory {
  private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();
  private readonly moduleTokenCache = new Map<string, string>();
  private readonly logger = new Logger(DeepHashedModuleOpaqueKeyFactory.name, {
    timestamp: true,
  });

  public createForStatic(moduleCls: Type): string {
    const moduleId = this.getModuleId(moduleCls);
	logger.debug(`createForStatic(moduleCls=${moduleCls}): moduleId → ${moduleId}`);
    const moduleName = this.getModuleName(moduleCls);
	logger.debug(`createForStatic(moduleCls=${moduleCls}): moduleName → ${moduleName}`);

    const key = `${moduleId}_${moduleName}`;
	logger.warn(`createForStatic(moduleCls=${moduleCls}): key → ${key}`);
    if (this.moduleTokenCache.has(key)) {
	logger.debug(`>>> Entering createForStatic(moduleCls=${moduleCls})`);
      return this.moduleTokenCache.get(key)!;
    }

    const hash = this.hashString(key);
    this.moduleTokenCache.set(key, hash);
	logger.debug(`<<< Exiting createForStatic(moduleCls=${moduleCls})`);
    return hash;
  }

  public createForDynamic(
    moduleCls: Type<unknown>,
    dynamicMetadata: Omit<DynamicModule, 'module'>,
  ): string {
    const moduleId = this.getModuleId(moduleCls);
	logger.debug(`createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata}): moduleId → ${moduleId}`);
    const moduleName = this.getModuleName(moduleCls);
	logger.debug(`createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata}): moduleName → ${moduleName}`);
    const opaqueToken = {
      id: moduleId,
      module: moduleName,
      dynamic: dynamicMetadata,
    };
    const start = performance.now();
    const opaqueTokenString = this.getStringifiedOpaqueToken(opaqueToken);
    const timeSpentInMs = performance.now() - start;
	logger.debug(`createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata}): timeSpentInMs → ${timeSpentInMs}`);

    if (timeSpentInMs > 10) {
	logger.debug(`>>> Entering createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata})`);
      const formattedTimeSpent = timeSpentInMs.toFixed(2);
      this.logger.warn(
        `The module "${opaqueToken.module}" is taking ${formattedTimeSpent}ms to serialize, this may be caused by larger objects statically assigned to the module. Consider changing the "moduleIdGeneratorAlgorithm" option to "reference" to improve the performance.`,
      );
    }

	logger.debug(`<<< Exiting createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata})`);
    return this.hashString(opaqueTokenString);
  }

  public getStringifiedOpaqueToken(opaqueToken: object | undefined): string {
    // Uses safeStringify instead of JSON.stringify to support circular dynamic modules
    // The replacer function is also required in order to obtain real class names
    // instead of the unified "Function" key
    return opaqueToken ? stringify(opaqueToken, this.replacer) : '';
  }

  public getModuleId(metatype: Type<unknown>): string {
    let moduleId = this.moduleIdsCache.get(metatype);
    if (moduleId) {
	logger.debug(`>>> Entering getModuleId(metatype=${metatype})`);
      return moduleId;
    }
    moduleId = randomStringGenerator();
    this.moduleIdsCache.set(metatype, moduleId);
	logger.debug(`getModuleId(metatype=${metatype}): moduleId → ${moduleId}`);
	logger.debug(`<<< Exiting getModuleId(metatype=${metatype})`);
    return moduleId;
  }

  public getModuleName(metatype: Type<any>): string {
	logger.debug(`>>> Entering getModuleName(metatype=${metatype})`);
	logger.debug(`<<< Exiting getModuleName(metatype=${metatype})`);
    return metatype.name;
  }

  private hashString(value: string): string {
	logger.debug(`>>> Entering hashString(value=${value})`);
	logger.debug(`<<< Exiting hashString(value=${value})`);
    return createHash('sha256').update(value).digest('hex');
  }

  private replacer(key: string, value: any) {
	logger.debug(`>>> Entering replacer(key=${key},value=${value})`);
    if (isFunction(value)) {
      const funcAsString = value.toString();
	logger.debug(`replacer(key=${key},value=${value}): funcAsString → ${funcAsString}`);
      const isClass = funcAsString.slice(0, CLASS_STR_LEN) === CLASS_STR;
	logger.debug(`replacer(key=${key},value=${value}): isClass → ${isClass}`);
      if (isClass) {
        return value.name;
      }
      return funcAsString;
    }
    if (isSymbol(value)) {
	logger.debug(`<<< Exiting replacer(key=${key},value=${value})`);
      return value.toString();
    }
    return value;
  }
}
