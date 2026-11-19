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
	LoggerService.error(`>>> Entering hierarchyLevel(level=${level})`, { "event.action": "hierarchyLevel", "logrite.level": level });
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
	LoggerService.error(`>>> Entering instance(value=${value})`, { "event.action": "instance", "logrite.value": value });
    this.values.set(STATIC_CONTEXT, { instance: value });
	LoggerService.warn(`<<< Exiting instance(value=${value})`, { "event.action": "instance", "logrite.value": value });
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
	LoggerService.error(`>>> Entering getInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "getInstanceByContextId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.getInstanceByInquirerId(contextId, inquirerId);
    }
    const instancePerContext = this.values.get(contextId);
	LoggerService.warn(`<<< Exiting getInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "getInstanceByContextId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
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
	LoggerService.error(`>>> Entering getInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "getInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    let collectionPerContext = this.transientMap!.get(inquirerId);
    if (!collectionPerContext) {
      collectionPerContext = new WeakMap();
	LoggerService.error(`getInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId}): collectionPerContext → ${collectionPerContext}`, { "event.action": "getInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
      this.transientMap!.set(inquirerId, collectionPerContext);
    }
    const instancePerContext = collectionPerContext.get(contextId);
    return instancePerContext
      ? instancePerContext
      : this.cloneTransientInstance(contextId, inquirerId);
	LoggerService.warn(`<<< Exiting getInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "getInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
  }

  public setInstanceByContextId(
    contextId: ContextId,
    value: InstancePerContext<T>,
    inquirerId?: string,
  ) {
	LoggerService.error(`>>> Entering setInstanceByContextId(contextId=${contextId},value=${value},inquirerId=${inquirerId})`, { "event.action": "setInstanceByContextId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.setInstanceByInquirerId(contextId, inquirerId, value);
    }
    this.values.set(contextId, value);
	LoggerService.warn(`<<< Exiting setInstanceByContextId(contextId=${contextId},value=${value},inquirerId=${inquirerId})`, { "event.action": "setInstanceByContextId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
  }

  public setInstanceByInquirerId(
    contextId: ContextId,
    inquirerId: string,
    value: InstancePerContext<T>,
  ) {
	LoggerService.error(`>>> Entering setInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId},value=${value})`, { "event.action": "setInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    let collection = this.transientMap!.get(inquirerId);
    if (!collection) {
      collection = new WeakMap();
	LoggerService.error(`setInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId},value=${value}): collection → ${collection}`, { "event.action": "setInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
      this.transientMap!.set(inquirerId, collection);
    }
    collection.set(contextId, value);
	LoggerService.warn(`<<< Exiting setInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId},value=${value})`, { "event.action": "setInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
  }

  public removeInstanceByContextId(contextId: ContextId, inquirerId?: string) {
	LoggerService.error(`>>> Entering removeInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "removeInstanceByContextId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.removeInstanceByInquirerId(contextId, inquirerId);
    }
    this.values.delete(contextId);
	LoggerService.warn(`<<< Exiting removeInstanceByContextId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "removeInstanceByContextId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
  }

  public removeInstanceByInquirerId(contextId: ContextId, inquirerId: string) {
	LoggerService.error(`>>> Entering removeInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "removeInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    const collection = this.transientMap!.get(inquirerId);
    if (!collection) {
      return;
    }
    collection.delete(contextId);
	LoggerService.error(`removeInstanceByInquirerId(contextId=${contextId},inquirerId=${inquirerId}): collection → ${collection}`, { "event.action": "removeInstanceByInquirerId", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
  }

  public addCtorMetadata(index: number, wrapper: InstanceWrapper) {
	LoggerService.error(`>>> Entering addCtorMetadata(index=${index},wrapper=${wrapper})`, { "event.action": "addCtorMetadata", "logrite.index": index, "logrite.wrapper": wrapper });
    if (!this[INSTANCE_METADATA_SYMBOL].dependencies) {
      this[INSTANCE_METADATA_SYMBOL].dependencies = [];
    }
    this[INSTANCE_METADATA_SYMBOL].dependencies[index] = wrapper;
    this.registerDependencyTreeParent(wrapper);
    this.resetDependencyTreeState();
	LoggerService.warn(`<<< Exiting addCtorMetadata(index=${index},wrapper=${wrapper})`, { "event.action": "addCtorMetadata", "logrite.index": index, "logrite.wrapper": wrapper });
  }

  public getCtorMetadata(): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].dependencies!;
  }

  public addPropertiesMetadata(key: symbol | string, wrapper: InstanceWrapper) {
	LoggerService.error(`>>> Entering addPropertiesMetadata(key=${String(key)},wrapper=${wrapper})`, { "event.action": "addPropertiesMetadata", "logrite.key": key, "logrite.wrapper": wrapper });
    if (!this[INSTANCE_METADATA_SYMBOL].properties) {
      this[INSTANCE_METADATA_SYMBOL].properties = [];
    }
    this[INSTANCE_METADATA_SYMBOL].properties.push({
      key,
      wrapper,
    });
    this.registerDependencyTreeParent(wrapper);
    this.resetDependencyTreeState();
	LoggerService.warn(`<<< Exiting addPropertiesMetadata(key=${String(key)},wrapper=${wrapper})`, { "event.action": "addPropertiesMetadata", "logrite.key": key, "logrite.wrapper": wrapper });
  }

  public getPropertiesMetadata(): PropertyMetadata[] {
    return this[INSTANCE_METADATA_SYMBOL].properties!;
  }

  public addEnhancerMetadata(wrapper: InstanceWrapper) {
	LoggerService.error(`>>> Entering addEnhancerMetadata(wrapper=${wrapper})`, { "event.action": "addEnhancerMetadata", "logrite.wrapper": wrapper });
    if (!this[INSTANCE_METADATA_SYMBOL].enhancers) {
      this[INSTANCE_METADATA_SYMBOL].enhancers = [];
    }
    this[INSTANCE_METADATA_SYMBOL].enhancers.push(wrapper);
    this.registerDependencyTreeParent(wrapper);
    this.resetDependencyTreeState();
	LoggerService.warn(`<<< Exiting addEnhancerMetadata(wrapper=${wrapper})`, { "event.action": "addEnhancerMetadata", "logrite.wrapper": wrapper });
  }

  public getEnhancersMetadata(): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].enhancers!;
  }

  public isDependencyTreeDurable(lookupRegistry: string[] = []): boolean {
	LoggerService.error(`>>> Entering isDependencyTreeDurable(lookupRegistry=${lookupRegistry})`, { "event.action": "isDependencyTreeDurable", "logrite.lookupRegistry": lookupRegistry });
    if (!isUndefined(this.isTreeDurable)) {
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
	LoggerService.debug(`isDependencyTreeDurable(lookupRegistry=${lookupRegistry}): this.isTreeDurable → ${this.isTreeDurable}`, { "event.action": "isDependencyTreeDurable", "logrite.lookupRegistry": lookupRegistry });
    if (this.isTreeDurable) {
      this.printIntrospectedAsDurable();
    }
	LoggerService.warn(`<<< Exiting isDependencyTreeDurable(lookupRegistry=${lookupRegistry})`, { "event.action": "isDependencyTreeDurable", "logrite.lookupRegistry": lookupRegistry });
    return this.isTreeDurable;
  }

  public introspectDepsAttribute(
    callback: (
      collection: InstanceWrapper[],
      lookupRegistry: string[],
    ) => boolean,
    lookupRegistry: string[] = [],
  ): boolean {
	LoggerService.error(`>>> Entering introspectDepsAttribute(callback=${callback},lookupRegistry=${lookupRegistry})`, { "event.action": "introspectDepsAttribute", "logrite.callback": callback, "logrite.lookupRegistry": lookupRegistry });
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
      return false;
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL]);

	LoggerService.error(`introspectDepsAttribute(callback=${callback},lookupRegistry=${lookupRegistry}): lookupRegistry → ${lookupRegistry}`, { "event.action": "introspectDepsAttribute", "logrite.callback": callback, "logrite.lookupRegistry": lookupRegistry });
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
	LoggerService.warn(`<<< Exiting introspectDepsAttribute(callback=${callback},lookupRegistry=${lookupRegistry})`, { "event.action": "introspectDepsAttribute", "logrite.callback": callback, "logrite.lookupRegistry": lookupRegistry });
    return enhancers ? callback(enhancers, lookupRegistry) : false;
  }

  public isDependencyTreeStatic(lookupRegistry: string[] = []): boolean {
	LoggerService.error(`>>> Entering isDependencyTreeStatic(lookupRegistry=${lookupRegistry})`, { "event.action": "isDependencyTreeStatic", "logrite.lookupRegistry": lookupRegistry });
    if (!isUndefined(this.isTreeStatic)) {
      return this.isTreeStatic;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeStatic = false;
	LoggerService.debug(`isDependencyTreeStatic(lookupRegistry=${lookupRegistry}): this.isTreeStatic → ${this.isTreeStatic}`, { "event.action": "isDependencyTreeStatic", "logrite.lookupRegistry": lookupRegistry });
      this.printIntrospectedAsRequestScoped();
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
	LoggerService.warn(`<<< Exiting isDependencyTreeStatic(lookupRegistry=${lookupRegistry})`, { "event.action": "isDependencyTreeStatic", "logrite.lookupRegistry": lookupRegistry });
    return this.isTreeStatic;
  }

  public cloneStaticInstance(contextId: ContextId): InstancePerContext<T> {
	LoggerService.error(`>>> Entering cloneStaticInstance(contextId=${contextId})`, { "event.action": "cloneStaticInstance", "logrite.contextId": contextId });
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    if (this.isDependencyTreeStatic()) {
	LoggerService.error(`cloneStaticInstance(contextId=${contextId}): staticInstance → ${staticInstance}`, { "event.action": "cloneStaticInstance", "logrite.contextId": contextId });
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
	LoggerService.warn(`<<< Exiting cloneStaticInstance(contextId=${contextId})`, { "event.action": "cloneStaticInstance", "logrite.contextId": contextId });
    return instancePerContext;
  }

  public cloneTransientInstance(
    contextId: ContextId,
    inquirerId: string,
  ): InstancePerContext<T> {
	LoggerService.error(`>>> Entering cloneTransientInstance(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "cloneTransientInstance", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined!,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) {
	LoggerService.error(`cloneTransientInstance(contextId=${contextId},inquirerId=${inquirerId}): staticInstance → ${staticInstance}`, { "event.action": "cloneTransientInstance", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
      instancePerContext.instance = Object.create(this.metatype!.prototype);
    }
    this.setInstanceByInquirerId(contextId, inquirerId, instancePerContext);
	LoggerService.warn(`<<< Exiting cloneTransientInstance(contextId=${contextId},inquirerId=${inquirerId})`, { "event.action": "cloneTransientInstance", "logrite.contextId": contextId, "logrite.inquirerId": inquirerId });
    return instancePerContext;
  }

  public createPrototype(contextId: ContextId) {
	LoggerService.error(`>>> Entering createPrototype(contextId=${contextId})`, { "event.action": "createPrototype", "logrite.contextId": contextId });
    const host = this.getInstanceByContextId(contextId);
    if (!this.isNewable() || host.isResolved) {
	LoggerService.error(`createPrototype(contextId=${contextId}): host → ${host}`, { "event.action": "createPrototype", "logrite.contextId": contextId });
      return;
    }
    return Object.create(this.metatype!.prototype);
  }

  public isInRequestScope(
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): boolean {
	LoggerService.error(`>>> Entering isInRequestScope(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isInRequestScope", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
    const isDependencyTreeStatic = this.isDependencyTreeStatic();

	LoggerService.warn(`<<< Exiting isInRequestScope(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isInRequestScope", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
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
	LoggerService.error(`>>> Entering isLazyTransient(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isLazyTransient", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
    const isInquirerRequestScoped = !!(
      inquirer && !inquirer.isDependencyTreeStatic()
    );

	LoggerService.warn(`<<< Exiting isLazyTransient(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isLazyTransient", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
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
	LoggerService.error(`>>> Entering isExplicitlyRequested(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isExplicitlyRequested", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
    const isSelfRequested = inquirer === this;
	LoggerService.warn(`<<< Exiting isExplicitlyRequested(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isExplicitlyRequested", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
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
	LoggerService.error(`>>> Entering isStatic(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isStatic", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
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
	LoggerService.error(`isStatic(contextId=${contextId},inquirer=${inquirer}): rootInquirer → ${rootInquirer}`, { "event.action": "isStatic", "logrite.contextId": contextId, "logrite.inquirer": inquirer });

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

	LoggerService.warn(`<<< Exiting isStatic(contextId=${contextId},inquirer=${inquirer})`, { "event.action": "isStatic", "logrite.contextId": contextId, "logrite.inquirer": inquirer });
    return false;
  }

  public attachRootInquirer(inquirer: InstanceWrapper) {
	LoggerService.error(`>>> Entering attachRootInquirer(inquirer=${inquirer})`, { "event.action": "attachRootInquirer", "logrite.inquirer": inquirer });
    if (!this.isTransient) {
      // Only attach root inquirer if the instance wrapper is transient
      return;
    }
    this.rootInquirer = inquirer.getRootInquirer() ?? inquirer;
	LoggerService.warn(`<<< Exiting attachRootInquirer(inquirer=${inquirer})`, { "event.action": "attachRootInquirer", "logrite.inquirer": inquirer });
  }

  getRootInquirer(): InstanceWrapper | undefined {
	LoggerService.error('>>> Entering getRootInquirer()', { "event.action": "getRootInquirer" });
	LoggerService.warn('<<< Exiting getRootInquirer()', { "event.action": "getRootInquirer" });
    return this.rootInquirer;
  }

  public getStaticTransientInstances() {
	LoggerService.error('>>> Entering getStaticTransientInstances()', { "event.action": "getStaticTransientInstances" });
    if (!this.transientMap) {
      return [];
    }
    const instances = [...this.transientMap.values()];
	LoggerService.warn('<<< Exiting getStaticTransientInstances()', { "event.action": "getStaticTransientInstances" });
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
	LoggerService.error(`>>> Entering mergeWith(provider=${provider})`, { "event.action": "mergeWith", "logrite.provider": provider });
    if (isValueProvider(provider)) {
      this.metatype = null;
	LoggerService.debug(`mergeWith(provider=${provider}): this.metatype → ${this.metatype}`, { "event.action": "mergeWith", "logrite.provider": provider });
      this.inject = null;
	LoggerService.debug(`mergeWith(provider=${provider}): this.inject → ${this.inject}`, { "event.action": "mergeWith", "logrite.provider": provider });

      this.scope = Scope.DEFAULT;

      this.setInstanceByContextId(STATIC_CONTEXT, {
        instance: provider.useValue,
        isResolved: true,
        isPending: false,
      });
    } else if (isClassProvider(provider)) {
	LoggerService.debug(`mergeWith(provider=${provider}): this.scope → ${this.scope}`, { "event.action": "mergeWith", "logrite.provider": provider });
      this.inject = null;
      this.metatype = provider.useClass;
    } else if (isFactoryProvider(provider)) {
      this.metatype = provider.useFactory;
      this.inject = provider.inject || [];
	LoggerService.warn(`<<< Exiting mergeWith(provider=${provider})`, { "event.action": "mergeWith", "logrite.provider": provider });
    }
  }

  private isNewable(): boolean {
	LoggerService.error('>>> Entering isNewable()', { "event.action": "isNewable" });
	LoggerService.warn('<<< Exiting isNewable()', { "event.action": "isNewable" });
    return isNil(this.inject) && this.metatype && this.metatype.prototype;
  }

  private registerDependencyTreeParent(wrapper: InstanceWrapper) {
	LoggerService.error(`>>> Entering registerDependencyTreeParent(wrapper=${wrapper})`, { "event.action": "registerDependencyTreeParent", "logrite.wrapper": wrapper });
    if (wrapper instanceof InstanceWrapper) {
      const parents = dependencyTreeParents.get(wrapper) ?? new Set();
	LoggerService.error(`registerDependencyTreeParent(wrapper=${wrapper}): parents → ${parents}`, { "event.action": "registerDependencyTreeParent", "logrite.wrapper": wrapper });
      parents.add(this);
      dependencyTreeParents.set(wrapper, parents);
	LoggerService.warn(`<<< Exiting registerDependencyTreeParent(wrapper=${wrapper})`, { "event.action": "registerDependencyTreeParent", "logrite.wrapper": wrapper });
    }
  }

  private resetDependencyTreeState(lookupRegistry = new Set<string>()) {
	LoggerService.error(`>>> Entering resetDependencyTreeState(lookupRegistry=${lookupRegistry})`, { "event.action": "resetDependencyTreeState", "logrite.lookupRegistry": lookupRegistry });
    if (lookupRegistry.has(this[INSTANCE_ID_SYMBOL])) {
      return;
    }
    lookupRegistry.add(this[INSTANCE_ID_SYMBOL]);
    this.isTreeStatic = undefined;
    this.isTreeDurable = undefined;
    dependencyTreeParents
      .get(this)
      ?.forEach(parent => parent.resetDependencyTreeState(lookupRegistry));
	LoggerService.warn(`<<< Exiting resetDependencyTreeState(lookupRegistry=${lookupRegistry})`, { "event.action": "resetDependencyTreeState", "logrite.lookupRegistry": lookupRegistry });
  }

  private initialize(
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>>,
  ) {
	LoggerService.error(`>>> Entering initialize(metadata=${metadata})`, { "event.action": "initialize", "logrite.metadata": metadata });
    const { instance, isResolved, ...wrapperPartial } = metadata;
    Object.assign(this, wrapperPartial);

    this.setInstanceByContextId(STATIC_CONTEXT, {
      instance: instance as T,
      isResolved,
    });
    this.scope === Scope.TRANSIENT && (this.transientMap = new Map());
	LoggerService.warn(`<<< Exiting initialize(metadata=${metadata})`, { "event.action": "initialize", "logrite.metadata": metadata });
  }

  private printIntrospectedAsRequestScoped() {
	LoggerService.error('>>> Entering printIntrospectedAsRequestScoped()', { "event.action": "printIntrospectedAsRequestScoped" });
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
	LoggerService.warn('<<< Exiting printIntrospectedAsRequestScoped()', { "event.action": "printIntrospectedAsRequestScoped" });
  }

  private printIntrospectedAsDurable() {
	LoggerService.error('>>> Entering printIntrospectedAsDurable()', { "event.action": "printIntrospectedAsDurable" });
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
	LoggerService.warn('<<< Exiting printIntrospectedAsDurable()', { "event.action": "printIntrospectedAsDurable" });
  }

  private isDebugMode(): boolean {
	LoggerService.error('>>> Entering isDebugMode()', { "event.action": "isDebugMode" });
	LoggerService.warn('<<< Exiting isDebugMode()', { "event.action": "isDebugMode" });
    return !!process.env.NEST_DEBUG;
  }

  private generateUuid(): string {
	LoggerService.error('>>> Entering generateUuid()', { "event.action": "generateUuid" });
    let key = this.name?.toString() ?? this.token?.toString();
    key += this.host?.name ?? '';
	LoggerService.error(`generateUuid(): key → ${key}`, { "event.action": "generateUuid" });

	LoggerService.warn('<<< Exiting generateUuid()', { "event.action": "generateUuid" });
    return key ? UuidFactory.get(key) : randomStringGenerator();
  }
}
