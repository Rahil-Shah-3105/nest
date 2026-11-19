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
	logger.error(`>>> Entering createForStatic(moduleCls=${moduleCls})`, { "event.action": "createForStatic", "logrite.moduleCls": moduleCls });
    const moduleId = this.getModuleId(moduleCls);
    const moduleName = this.getModuleName(moduleCls);
	logger.error(`createForStatic(moduleCls=${moduleCls}): moduleId → ${moduleId}`, { "event.action": "createForStatic", "logrite.moduleCls": moduleCls });
	logger.error(`createForStatic(moduleCls=${moduleCls}): moduleName → ${moduleName}`, { "event.action": "createForStatic", "logrite.moduleCls": moduleCls });

    const key = `${moduleId}_${moduleName}`;
	logger.error(`createForStatic(moduleCls=${moduleCls}): key → ${key}`, { "event.action": "createForStatic", "logrite.moduleCls": moduleCls });
    if (this.moduleTokenCache.has(key)) {
      return this.moduleTokenCache.get(key)!;
    }

    const hash = this.hashString(key);
    this.moduleTokenCache.set(key, hash);
	logger.warn(`<<< Exiting createForStatic(moduleCls=${moduleCls})`, { "event.action": "createForStatic", "logrite.moduleCls": moduleCls });
    return hash;
  }

  public createForDynamic(
    moduleCls: Type<unknown>,
    dynamicMetadata: Omit<DynamicModule, 'module'>,
  ): string {
	logger.error(`>>> Entering createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata})`, { "event.action": "createForDynamic", "logrite.moduleCls": moduleCls, "logrite.dynamicMetadata": dynamicMetadata });
    const moduleId = this.getModuleId(moduleCls);
    const moduleName = this.getModuleName(moduleCls);
	logger.error(`createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata}): moduleId → ${moduleId}`, { "event.action": "createForDynamic", "logrite.moduleCls": moduleCls, "logrite.dynamicMetadata": dynamicMetadata });
    const opaqueToken = {
      id: moduleId,
      module: moduleName,
      dynamic: dynamicMetadata,
    };
    const start = performance.now();
	logger.error(`createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata}): moduleName → ${moduleName}`, { "event.action": "createForDynamic", "logrite.moduleCls": moduleCls, "logrite.dynamicMetadata": dynamicMetadata });
    const opaqueTokenString = this.getStringifiedOpaqueToken(opaqueToken);
    const timeSpentInMs = performance.now() - start;
	logger.error(`createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata}): timeSpentInMs → ${timeSpentInMs}`, { "event.action": "createForDynamic", "logrite.moduleCls": moduleCls, "logrite.dynamicMetadata": dynamicMetadata });

    if (timeSpentInMs > 10) {
      const formattedTimeSpent = timeSpentInMs.toFixed(2);
      this.logger.warn(
        `The module "${opaqueToken.module}" is taking ${formattedTimeSpent}ms to serialize, this may be caused by larger objects statically assigned to the module. Consider changing the "moduleIdGeneratorAlgorithm" option to "reference" to improve the performance.`,
      );
    }

	logger.warn(`<<< Exiting createForDynamic(moduleCls=${moduleCls},dynamicMetadata=${dynamicMetadata})`, { "event.action": "createForDynamic", "logrite.moduleCls": moduleCls, "logrite.dynamicMetadata": dynamicMetadata });
    return this.hashString(opaqueTokenString);
  }

  public getStringifiedOpaqueToken(opaqueToken: object | undefined): string {
    // Uses safeStringify instead of JSON.stringify to support circular dynamic modules
    // The replacer function is also required in order to obtain real class names
    // instead of the unified "Function" key
    return opaqueToken ? stringify(opaqueToken, this.replacer) : '';
  }

  public getModuleId(metatype: Type<unknown>): string {
	logger.error(`>>> Entering getModuleId(metatype=${metatype})`, { "event.action": "getModuleId", "logrite.metatype": metatype });
    let moduleId = this.moduleIdsCache.get(metatype);
    if (moduleId) {
      return moduleId;
    }
    moduleId = randomStringGenerator();
    this.moduleIdsCache.set(metatype, moduleId);
	logger.error(`getModuleId(metatype=${metatype}): moduleId → ${moduleId}`, { "event.action": "getModuleId", "logrite.metatype": metatype });
	logger.warn(`<<< Exiting getModuleId(metatype=${metatype})`, { "event.action": "getModuleId", "logrite.metatype": metatype });
    return moduleId;
  }

  public getModuleName(metatype: Type<any>): string {
	logger.error(`>>> Entering getModuleName(metatype=${metatype})`, { "event.action": "getModuleName", "logrite.metatype": metatype });
	logger.warn(`<<< Exiting getModuleName(metatype=${metatype})`, { "event.action": "getModuleName", "logrite.metatype": metatype });
    return metatype.name;
  }

  private hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private replacer(key: string, value: any) {
	logger.error(`>>> Entering replacer(key=${key},value=${value})`, { "event.action": "replacer", "logrite.key": key, "logrite.value": value });
    if (isFunction(value)) {
      const funcAsString = value.toString();
	logger.error(`replacer(key=${key},value=${value}): funcAsString → ${funcAsString}`, { "event.action": "replacer", "logrite.key": key, "logrite.value": value });
      const isClass = funcAsString.slice(0, CLASS_STR_LEN) === CLASS_STR;
	logger.error(`replacer(key=${key},value=${value}): isClass → ${isClass}`, { "event.action": "replacer", "logrite.key": key, "logrite.value": value });
      if (isClass) {
        return value.name;
      }
      return funcAsString;
    }
    if (isSymbol(value)) {
      return value.toString();
    }
	logger.warn(`<<< Exiting replacer(key=${key},value=${value})`, { "event.action": "replacer", "logrite.key": key, "logrite.value": value });
    return value;
  }
}
