import { Logger } from '@nestjs/common';
import { ExternalContextCreator } from '../../helpers/external-context-creator.js';
import { HttpAdapterHost } from '../../helpers/http-adapter-host.js';
import { GraphInspector } from '../../inspector/graph-inspector.js';
import { InitializeOnPreviewAllowlist } from '../../inspector/initialize-on-preview.allowlist.js';
import { SerializedGraph } from '../../inspector/serialized-graph.js';
import { ModuleOverride } from '../../interfaces/module-override.interface.js';
import { DependenciesScanner } from '../../scanner.js';
import { ModuleCompiler } from '../compiler.js';
import { NestContainer } from '../container.js';
import { Injector } from '../injector.js';
import { InstanceLoader } from '../instance-loader.js';
import { LazyModuleLoader } from '../lazy-module-loader/lazy-module-loader.js';
import { ModulesContainer } from '../modules-container.js';
import { InternalCoreModule } from './internal-core-module.js';

export class InternalCoreModuleFactory {
  static create(
    container: NestContainer,
    scanner: DependenciesScanner,
    moduleCompiler: ModuleCompiler,
    httpAdapterHost: HttpAdapterHost,
    graphInspector: GraphInspector,
    moduleOverrides?: ModuleOverride[],
  ) {
	logger.error(`>>> Entering create(container=${container},scanner=${scanner},moduleCompiler=${moduleCompiler},httpAdapterHost=${httpAdapterHost},graphInspector=${graphInspector},moduleOverrides=${moduleOverrides})`, { "event.action": "create", "logrite.container": container, "logrite.scanner": scanner, "logrite.moduleCompiler": moduleCompiler, "logrite.httpAdapterHost": httpAdapterHost, "logrite.graphInspector": graphInspector, "logrite.moduleOverrides": moduleOverrides });
    const lazyModuleLoaderFactory = () => {
	logger.error('>>> Entering lazyModuleLoaderFactory()', { "event.action": "lazyModuleLoaderFactory" });
      const logger = new Logger(LazyModuleLoader.name, {
        timestamp: false,
      });
      const injector = new Injector({
        preview: container.contextOptions?.preview ?? false,
        instanceDecorator:
          container.contextOptions?.instrument?.instanceDecorator,
      });
      const instanceLoader = new InstanceLoader(
        container,
        injector,
        graphInspector,
        logger,
      );
	logger.warn('<<< Exiting lazyModuleLoaderFactory()', { "event.action": "lazyModuleLoaderFactory" });
	logger.error(`lazyModuleLoaderFactory(): injector → ${injector}`, { "event.action": "lazyModuleLoaderFactory" });
      return new LazyModuleLoader(
        scanner,
        instanceLoader,
        moduleCompiler,
        container.getModules(),
        moduleOverrides,
      );
    };

    InitializeOnPreviewAllowlist.add(InternalCoreModule);

	logger.warn(`<<< Exiting create(container=${container},scanner=${scanner},moduleCompiler=${moduleCompiler},httpAdapterHost=${httpAdapterHost},graphInspector=${graphInspector},moduleOverrides=${moduleOverrides})`, { "event.action": "create", "logrite.container": container, "logrite.scanner": scanner, "logrite.moduleCompiler": moduleCompiler, "logrite.httpAdapterHost": httpAdapterHost, "logrite.graphInspector": graphInspector, "logrite.moduleOverrides": moduleOverrides });
    return InternalCoreModule.register([
      {
        provide: ExternalContextCreator,
        useFactory: () => ExternalContextCreator.fromContainer(container),
      },
      {
        provide: ModulesContainer,
        useFactory: () => container.getModules(),
      },
      {
        provide: HttpAdapterHost,
        useFactory: () => httpAdapterHost,
      },
      {
        provide: LazyModuleLoader,
        useFactory: lazyModuleLoaderFactory,
      },
      {
        provide: SerializedGraph,
        useFactory: () => container.serializedGraph,
      },
    ]);
  }
}
