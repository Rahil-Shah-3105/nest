import type { FactoryProvider, InjectionToken } from '@nestjs/common';
import {
  Logger,
  type LoggerService,
  type Provider,
  Scope,
  type Type,
} from '@nestjs/common';
import {
  type EnhancerSubtype,
  clc,
  isNil,
  isString,
  isUndefined,
  randomStringGenerator,
} from '@nestjs/common/internal';
import { iterate } from 'iterare';
import { UuidFactory } from '../inspector/uuid-factory.js';
import { STATIC_CONTEXT } from './constants.js';
import {
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from './helpers/provider-classifier.js';
import { Module } from './module.js';
import { SettlementSignal } from './settlement-signal.js';

export const INSTANCE_METADATA_SYMBOL = Symbol.for('instance_metadata:cache');
export const INSTANCE_ID_SYMBOL = Symbol.for('instance_metadata:id');

export interface HostComponentInfo {
  /**
   * Injection token (or class reference)
   */
  token: InjectionToken;
  /**
   * Flag that indicates whether DI subtree is durable
   */
  isTreeDurable: boolean;
}

export interface ContextId {
  readonly id: number;
  payload?: unknown;
  getParent?(info: HostComponentInfo): ContextId;
}

export interface InstancePerContext<T> {
  instance: T;
  isResolved?: boolean;
  isPending?: boolean;
  donePromise?: Promise<unknown>;
  isConstructorCalled?: boolean;
}

export interface PropertyMetadata {
  key: symbol | string;
  wrapper: InstanceWrapper;
}

interface InstanceMetadataStore {
  dependencies?: InstanceWrapper[];
  properties?: PropertyMetadata[];
  enhancers?: InstanceWrapper[];
}

const dependencyTreeParents = new WeakMap<
  InstanceWrapper,
  Set<InstanceWrapper>
>();

export class InstanceWrapper<T = any> {
  public readonly name: any;
  public readonly token: InjectionToken;
  public readonly async?: boolean;
  public readonly host?: Module;
  public readonly isAlias: boolean = false;
  public readonly subtype?: EnhancerSubtype;
  public scope?: Scope = Scope.DEFAULT;
  public metatype: Type<T> | Function | null;
  public inject?: FactoryProvider['inject'] | null;
  public forwardRef?: boolean;
  public durable?: boolean;
  public initTime?: number;
  public settlementSignal?: SettlementSignal;

  private static logger: LoggerService = new Logger(InstanceWrapper.name);

  private readonly values = new WeakMap<ContextId, InstancePerContext<T>>();
  private readonly [INSTANCE_METADATA_SYMBOL]: InstanceMetadataStore = {};
  private readonly [INSTANCE_ID_SYMBOL]: string;
  private transientMap?:
    | Map<string, WeakMap<ContextId, InstancePerContext<T>>>
    | undefined;
  private isTreeStatic: boolean | undefined;
  private isTreeDurable: boolean | undefined;
  private _hierarchyLevel = 0;

  get hierarchyLevel(): number {
	LoggerService.debug(`>>> Entering hierarchyLevel(level=${level})`);
    return this._hierarchyLevel;
  }

  set hierarchyLevel(level: number) {
    this._hierarchyLevel = level;
  }

  /**
   * The root inquirer reference. Present only if child instance wrapper
   * is transient and has a parent inquirer.
   */
  private rootInquirer: InstanceWrapper | undefined;

  constructor(
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>> = {},
  ) {
    this.initialize(metadata);
    this[INSTANCE_ID_SYMBOL] =
      metadata[INSTANCE_ID_SYMBOL] ?? this.generateUuid();
  }

  get id(): string {
    return this[INSTANCE_ID_SYMBOL];
  }

  set instance(value: T) {
	LoggerService.debug(`>>> Entering instance(value=${value})`);
    this.values.set(STATIC_CONTEXT, { instance: value });
	LoggerService.debug(`<<< Exiting instance(value=${value})`);
  }

  get instance(): T {
    const instancePerContext = this.getInstanceByContextId(STATIC_CONTEXT);
    return instancePerContext.instance;
  }

  get isNotMetatype(): boolean {
    return !this.metatype || this.isFactory;
  }

  get isFactory(): boolean {
    return !!this.metatype && !isNil(this.inject);
  }

  get isTransient(): boolean {
    return this.scope === Scope.TRANSIENT;
  }

  public getInstanceByContextId(
    contextId: ContextId,
    inquirerId?: string,
  ): InstancePerContext<T> {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
	LoggerService.debug(`>>> Entering getInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`);
      return this.getInstanceByInquirerId(contextId, inquirerId);
    }
    const instancePerContext = this.values.get(contextId);
	LoggerService.debug(`<<< Exiting getInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`);
    return instancePerContext
      ? instancePerContext
      : contextId !== STATIC_CONTEXT
        ? this.cloneStaticInstance(contextId)
        : {
            instance: null as T,
            isResolved: true,
            isPending: false,
          };
  }

  public getInstanceByInquirerId(
    contextId: ContextId,
    inquirerId: string,
  ): InstancePerContext<T> {
    let collectionPerContext = this.transientMap!.get(inquirerId);
	LoggerService.debug(`getInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId}): collectionPerContext → ${collectionPerContext}`);
    if (!collectionPerContext) {
	LoggerService.debug(`>>> Entering getInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId})`);
      collectionPerContext = new WeakMap();
      this.transientMap!.set(inquirerId, collectionPerContext);
    }
    const instancePerContext = collectionPerContext.get(contextId);
    return instancePerContext
      ? instancePerContext
      : this.cloneTransientInstance(contextId, inquirerId);
	LoggerService.debug(`<<< Exiting getInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId})`);
  }

  public setInstanceByContextId(
    contextId: ContextId,
    value: InstancePerContext<T>,
    inquirerId?: string,
  ) {
	LoggerService.debug(`>>> Entering setInstanceByContextId(contextId=${contextId},value=${value},inquirerId=${inquirerId})`);
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.setInstanceByInquirerId(contextId, inquirerId, value);
    }
    this.values.set(contextId, value);
	LoggerService.debug(`<<< Exiting setInstanceByContextId(contextId=${contextId},value=${value},inquirerId=${inquirerId})`);
  }

  public setInstanceByInquirerId(
    contextId: ContextId,
    inquirerId: string,
    value: InstancePerContext<T>,
  ) {
	LoggerService.debug(`>>> Entering setInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId},value=${value})`);
    let collection = this.transientMap!.get(inquirerId);
    if (!collection) {
	LoggerService.debug(`setInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId},value=${value}): collection → ${collection}`);
      collection = new WeakMap();
      this.transientMap!.set(inquirerId, collection);
    }
    collection.set(contextId, value);
	LoggerService.debug(`<<< Exiting setInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId},value=${value})`);
  }

  public removeInstanceByContextId(contextId: ContextId, inquirerId?: string) {
	LoggerService.debug(`>>> Entering removeInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`);
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.removeInstanceByInquirerId(contextId, inquirerId);
    }
    this.values.delete(contextId);
	LoggerService.debug(`<<< Exiting removeInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`);
  }

  public removeInstanceByInquirerId(contextId: ContextId, inquirerId: string) {
	LoggerService.debug(`>>> Entering removeInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId})`);
    const collection = this.transientMap!.get(inquirerId);
    if (!collection) {
      return;
    }
    collection.delete(contextId);
	LoggerService.debug(`removeInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId}): collection → ${collection}`);
  }

  public addCtorMetadata(index: number, wrapper: InstanceWrapper) {
	LoggerService.debug(`>>> Entering addCtorMetadata(index=${index},wrapper=${wrapper})`);
    if (!this[INSTANCE_METADATA_SYMBOL].dependencies) {
      this[INSTANCE_METADATA_SYMBOL].dependencies = [];
    }
    this[INSTANCE_METADATA_SYMBOL].dependencies[index] = wrapper;
    this.registerDependencyTreeParent(wrapper);
    this.resetDependencyTreeState();
	LoggerService.debug(`<<< Exiting addCtorMetadata(index=${index},wrapper=${wrapper})`);
  }

  public getCtorMetadata(): InstanceWrapper[] {
	LoggerService.debug('>>> Entering getCtorMetadata()');
	LoggerService.debug('<<< Exiting getCtorMetadata()');
    return this[INSTANCE_METADATA_SYMBOL].dependencies!;
  }

  public addPropertiesMetadata(key: symbol | string, wrapper: InstanceWrapper) {
	LoggerService.debug(`>>> Entering addPropertiesMetadata(key=${key},wrapper=${wrapper})`);
    if (!this[INSTANCE_METADATA_SYMBOL].properties) {
      this[INSTANCE_METADATA_SYMBOL].properties = [];
    }
    this[INSTANCE_METADATA_SYMBOL].properties.push({
      key,
      wrapper,
    });
    this.registerDependencyTreeParent(wrapper);
    this.resetDependencyTreeState();
	LoggerService.debug(`<<< Exiting addPropertiesMetadata(key=${key},wrapper=${wrapper})`);
  }

  public getPropertiesMetadata(): PropertyMetadata[] {
	LoggerService.debug('>>> Entering getPropertiesMetadata()');
	LoggerService.debug('<<< Exiting getPropertiesMetadata()');
    return this[INSTANCE_METADATA_SYMBOL].properties!;
  }

  public addEnhancerMetadata(wrapper: InstanceWrapper) {
	LoggerService.debug(`>>> Entering addEnhancerMetadata(wrapper=${wrapper})`);
    if (!this[INSTANCE_METADATA_SYMBOL].enhancers) {
      this[INSTANCE_METADATA_SYMBOL].enhancers = [];
    }
    this[INSTANCE_METADATA_SYMBOL].enhancers.push(wrapper);
    this.registerDependencyTreeParent(wrapper);
    this.resetDependencyTreeState();
	LoggerService.debug(`<<< Exiting addEnhancerMetadata(wrapper=${wrapper})`);
  }

  public getEnhancersMetadata(): InstanceWrapper[] {
	LoggerService.debug('>>> Entering getEnhancersMetadata()');
	LoggerService.debug('<<< Exiting getEnhancersMetadata()');
    return this[INSTANCE_METADATA_SYMBOL].enhancers!;
  }

  public isDependencyTreeDurable(lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeDurable)) {
	LoggerService.debug(`>>> Entering isDependencyTreeDurable(lookupRegistry=${lookupRegistry})`);
      return this.isTreeDurable;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeDurable = this.durable === undefined ? false : this.durable;
      if (this.isTreeDurable) {
        this.printIntrospectedAsDurable();
      }
      return this.isTreeDurable;
    }
    const isStatic = this.isDependencyTreeStatic();
    if (isStatic) {
      return false;
	LoggerService.debug(`>>> Entering isStatic(contextId=${contextId},inquirer=${inquirer})`);
	LoggerService.debug(`<<< Exiting isStatic(contextId=${contextId},inquirer=${inquirer})`);
    }

    const isTreeNonDurable = this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) =>
            !item.isDependencyTreeStatic() &&
            !item.isDependencyTreeDurable(registry),
        ),
      lookupRegistry,
    );
    this.isTreeDurable = !isTreeNonDurable;
    if (this.isTreeDurable) {
	LoggerService.debug(`isDependencyTreeDurable(lookupRegistry=${lookupRegistry}): this.isTreeDurable → ${this.isTreeDurable}`);
      this.printIntrospectedAsDurable();
    }
	LoggerService.debug(`<<< Exiting isDependencyTreeDurable(lookupRegistry=${lookupRegistry})`);
    return this.isTreeDurable;
  }

  public introspectDepsAttribute(
    callback: (
      collection: InstanceWrapper[],
      lookupRegistry: string[],
    ) => boolean,
    lookupRegistry: string[] = [],
  ): boolean {
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
	LoggerService.debug(`>>> Entering introspectDepsAttribute(callback=${callback},lookupRegistry=${lookupRegistry})`);
      return false;
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL]);

	LoggerService.debug(`introspectDepsAttribute(callback=${callback},lookupRegistry=${lookupRegistry}): lookupRegistry → ${lookupRegistry}`);
    const { dependencies, properties, enhancers } =
      this[INSTANCE_METADATA_SYMBOL];

    let introspectionResult = dependencies
      ? callback(dependencies, lookupRegistry)
      : false;

    if (introspectionResult || !(properties || enhancers)) {
      return introspectionResult;
    }
    introspectionResult = properties
      ? callback(
          properties.map(item => item.wrapper),
          lookupRegistry,
        )
      : false;
    if (introspectionResult || !enhancers) {
      return introspectionResult;
    }
	LoggerService.debug(`<<< Exiting introspectDepsAttribute(callback=${callback},lookupRegistry=${lookupRegistry})`);
    return enhancers ? callback(enhancers, lookupRegistry) : false;
  }

  public isDependencyTreeStatic(lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeStatic)) {
	LoggerService.debug(`>>> Entering isDependencyTreeStatic(lookupRegistry=${lookupRegistry})`);
      return this.isTreeStatic;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeStatic = false;
      this.printIntrospectedAsRequestScoped();
	LoggerService.debug(`isDependencyTreeStatic(lookupRegistry=${lookupRegistry}): this.isTreeStatic → ${this.isTreeStatic}`);
      return this.isTreeStatic;
    }
    this.isTreeStatic = !this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) => !item.isDependencyTreeStatic(registry),
        ),
      lookupRegistry,
    );
    if (!this.isTreeStatic) {
      this.printIntrospectedAsRequestScoped();
    }
	LoggerService.debug(`<<< Exiting isDependencyTreeStatic(lookupRegistry=${lookupRegistry})`);
    return this.isTreeStatic;
  }

  public cloneStaticInstance(contextId: ContextId): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
	LoggerService.debug(`cloneStaticInstance(contextId=${contextId}): staticInstance → ${staticInstance}`);
    if (this.isDependencyTreeStatic()) {
	LoggerService.debug(`>>> Entering cloneStaticInstance(contextId=${contextId})`);
      return staticInstance;
    }
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined!,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) {
      instancePerContext.instance = Object.create(this.metatype!.prototype);
    }
    this.setInstanceByContextId(contextId, instancePerContext);
	LoggerService.debug(`<<< Exiting cloneStaticInstance(contextId=${contextId})`);
    return instancePerContext;
  }

  public cloneTransientInstance(
    contextId: ContextId,
    inquirerId: string,
  ): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
	LoggerService.debug(`cloneTransientInstance(contextId=${contextId},inquirerId=${inquirerId}): staticInstance → ${staticInstance}`);
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined!,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) {
	LoggerService.debug(`>>> Entering cloneTransientInstance(contextId=${contextId},inquirerId=${inquirerId})`);
      instancePerContext.instance = Object.create(this.metatype!.prototype);
    }
    this.setInstanceByInquirerId(contextId, inquirerId, instancePerContext);
	LoggerService.debug(`<<< Exiting cloneTransientInstance(contextId=${contextId},inquirerId=${inquirerId})`);
    return instancePerContext;
  }

  public createPrototype(contextId: ContextId) {
	LoggerService.debug(`>>> Entering createPrototype(contextId=${contextId})`);
    const host = this.getInstanceByContextId(contextId);
    if (!this.isNewable() || host.isResolved) {
	LoggerService.debug(`createPrototype(contextId=${contextId}): host → ${host}`);
      return;
    }
    return Object.create(this.metatype!.prototype);
  }

  public isInRequestScope(
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): boolean {
	LoggerService.debug(`>>> Entering isInRequestScope(contextId=${contextId},inquirer=${inquirer})`);
    const isDependencyTreeStatic = this.isDependencyTreeStatic();

	LoggerService.debug(`<<< Exiting isInRequestScope(contextId=${contextId},inquirer=${inquirer})`);
    return (
      !isDependencyTreeStatic &&
      contextId !== STATIC_CONTEXT &&
      (!this.isTransient || (this.isTransient && !!inquirer))
    );
  }

  public isLazyTransient(
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined,
  ): boolean {
	LoggerService.debug(`>>> Entering isLazyTransient(contextId=${contextId},inquirer=${inquirer})`);
    const isInquirerRequestScoped = !!(
      inquirer && !inquirer.isDependencyTreeStatic()
    );

	LoggerService.debug(`<<< Exiting isLazyTransient(contextId=${contextId},inquirer=${inquirer})`);
    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      this.isTransient &&
      isInquirerRequestScoped
    );
  }

  public isExplicitlyRequested(
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): boolean {
	LoggerService.debug(`>>> Entering isExplicitlyRequested(contextId=${contextId},inquirer=${inquirer})`);
    const isSelfRequested = inquirer === this;
	LoggerService.debug(`<<< Exiting isExplicitlyRequested(contextId=${contextId},inquirer=${inquirer})`);
    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      (isSelfRequested || !!(inquirer && inquirer.scope === Scope.TRANSIENT))
    );
  }

  public isStatic(
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined,
  ): boolean {
    if (!this.isDependencyTreeStatic() || contextId !== STATIC_CONTEXT) {
      return false;
    }

    // Non-transient provider in static context
    if (!this.isTransient) {
      return true;
    }

    const isInquirerRequestScoped =
      inquirer && !inquirer.isDependencyTreeStatic();
    const isStaticTransient = this.isTransient && !isInquirerRequestScoped;
    const rootInquirer = inquirer?.getRootInquirer();
	LoggerService.debug(`isStatic(contextId=${contextId},inquirer=${inquirer}): rootInquirer → ${rootInquirer}`);

    // Transient provider inquired by non-transient (e.g., DEFAULT -> TRANSIENT)
    if (isStaticTransient && inquirer && !inquirer.isTransient) {
      return true;
    }

    // Nested transient with non-transient root (e.g., DEFAULT -> TRANSIENT -> TRANSIENT)
    if (isStaticTransient && rootInquirer && !rootInquirer.isTransient) {
      return true;
    }

    // Nested transient during initial instantiation (rootInquirer not yet set)
    if (isStaticTransient && inquirer?.isTransient && !rootInquirer) {
      return true;
    }

    return false;
  }

  public attachRootInquirer(inquirer: InstanceWrapper) {
	LoggerService.debug(`>>> Entering attachRootInquirer(inquirer=${inquirer})`);
    if (!this.isTransient) {
      // Only attach root inquirer if the instance wrapper is transient
      return;
    }
    this.rootInquirer = inquirer.getRootInquirer() ?? inquirer;
	LoggerService.debug(`<<< Exiting attachRootInquirer(inquirer=${inquirer})`);
  }

  getRootInquirer(): InstanceWrapper | undefined {
	LoggerService.debug('>>> Entering getRootInquirer()');
	LoggerService.debug('<<< Exiting getRootInquirer()');
    return this.rootInquirer;
  }

  public getStaticTransientInstances() {
	LoggerService.debug('>>> Entering getStaticTransientInstances()');
    if (!this.transientMap) {
      return [];
    }
    const instances = [...this.transientMap.values()];
	LoggerService.debug('<<< Exiting getStaticTransientInstances()');
    return iterate(instances)
      .map(item => item.get(STATIC_CONTEXT))
      .filter(item => {
        // Only return items where constructor has been actually called
        // This prevents calling lifecycle hooks on non-instantiated transient services
        return !!(item && item.isConstructorCalled);
      })
      .toArray();
  }

  public mergeWith(provider: Provider) {
	LoggerService.debug(`>>> Entering mergeWith(provider=${provider})`);
    if (isValueProvider(provider)) {
      this.metatype = null;
      this.inject = null;
	LoggerService.debug(`mergeWith(provider=${provider}): this.metatype → ${this.metatype}`);

      this.scope = Scope.DEFAULT;

      this.setInstanceByContextId(STATIC_CONTEXT, {
        instance: provider.useValue,
        isResolved: true,
        isPending: false,
      });
    } else if (isClassProvider(provider)) {
	LoggerService.debug(`mergeWith(provider=${provider}): this.inject → ${this.inject}`);
	LoggerService.debug(`mergeWith(provider=${provider}): this.scope → ${this.scope}`);
      this.inject = null;
      this.metatype = provider.useClass;
    } else if (isFactoryProvider(provider)) {
      this.metatype = provider.useFactory;
      this.inject = provider.inject || [];
    }
  }

  private isNewable(): boolean {
	LoggerService.debug('>>> Entering isNewable()');
	LoggerService.debug('<<< Exiting isNewable()');
    return isNil(this.inject) && this.metatype && this.metatype.prototype;
  }

  private registerDependencyTreeParent(wrapper: InstanceWrapper) {
	LoggerService.debug(`>>> Entering registerDependencyTreeParent(wrapper=${wrapper})`);
    if (wrapper instanceof InstanceWrapper) {
      const parents = dependencyTreeParents.get(wrapper) ?? new Set();
	LoggerService.debug(`registerDependencyTreeParent(wrapper=${wrapper}): parents → ${parents}`);
      parents.add(this);
      dependencyTreeParents.set(wrapper, parents);
	LoggerService.debug(`<<< Exiting registerDependencyTreeParent(wrapper=${wrapper})`);
    }
  }

  private resetDependencyTreeState(lookupRegistry = new Set<string>()) {
	LoggerService.debug(`>>> Entering resetDependencyTreeState(lookupRegistry=${lookupRegistry})`);
    if (lookupRegistry.has(this[INSTANCE_ID_SYMBOL])) {
      return;
    }
    lookupRegistry.add(this[INSTANCE_ID_SYMBOL]);
    this.isTreeStatic = undefined;
    this.isTreeDurable = undefined;
    dependencyTreeParents
      .get(this)
      ?.forEach(parent => parent.resetDependencyTreeState(lookupRegistry));
	LoggerService.debug(`<<< Exiting resetDependencyTreeState(lookupRegistry=${lookupRegistry})`);
  }

  private initialize(
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>>,
  ) {
	LoggerService.debug(`>>> Entering initialize(metadata=${metadata})`);
    const { instance, isResolved, ...wrapperPartial } = metadata;
    Object.assign(this, wrapperPartial);

    this.setInstanceByContextId(STATIC_CONTEXT, {
      instance: instance as T,
      isResolved,
    });
    this.scope === Scope.TRANSIENT && (this.transientMap = new Map());
	LoggerService.debug(`<<< Exiting initialize(metadata=${metadata})`);
  }

  private printIntrospectedAsRequestScoped() {
	LoggerService.debug('>>> Entering printIntrospectedAsRequestScoped()');
    if (!this.isDebugMode() || this.name === 'REQUEST') {
      return;
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${clc.cyanBright(this.name)}${clc.green(
          ' introspected as ',
        )}${clc.magentaBright('request-scoped')}`,
      );
    }
	LoggerService.debug('<<< Exiting printIntrospectedAsRequestScoped()');
  }

  private printIntrospectedAsDurable() {
	LoggerService.debug('>>> Entering printIntrospectedAsDurable()');
    if (!this.isDebugMode()) {
      return;
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${clc.cyanBright(this.name)}${clc.green(
          ' introspected as ',
        )}${clc.magentaBright('durable')}`,
      );
    }
	LoggerService.debug('<<< Exiting printIntrospectedAsDurable()');
  }

  private isDebugMode(): boolean {
	LoggerService.debug('>>> Entering isDebugMode()');
	LoggerService.debug('<<< Exiting isDebugMode()');
    return !!process.env.NEST_DEBUG;
  }

  private generateUuid(): string {
	LoggerService.debug('>>> Entering generateUuid()');
    let key = this.name?.toString() ?? this.token?.toString();
	LoggerService.warn(`generateUuid(): key → ${key}`);
    key += this.host?.name ?? '';

	LoggerService.debug('<<< Exiting generateUuid()');
    return key ? UuidFactory.get(key) : randomStringGenerator();
  }
}
