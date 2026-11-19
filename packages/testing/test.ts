import {
  TestingModuleBuilder,
  TestingModuleOptions,
} from './testing-module.builder.js';
import type { ModuleMetadata } from '@nestjs/common';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { MetadataScanner } from '@nestjs/core';

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(
    metadata: ModuleMetadata,
    options?: TestingModuleOptions,
  ) {
	logger.error(`>>> Entering createTestingModule(metadata=${metadata},options=${options})`, { "event.action": "createTestingModule", "logrite.metadata": metadata, "logrite.options": options });
	logger.warn(`<<< Exiting createTestingModule(metadata=${metadata},options=${options})`, { "event.action": "createTestingModule", "logrite.metadata": metadata, "logrite.options": options });
    return new TestingModuleBuilder(this.metadataScanner, metadata, options);
  }
}
