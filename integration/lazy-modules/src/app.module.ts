const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { EagerModule } from './eager.module.js';
import { GlobalModule } from './global.module.js';
import { LazyModule } from './lazy.module.js';

@Module({
  imports: [GlobalModule, EagerModule],
})
export class AppModule {
  constructor(public loader: LazyModuleLoader) {}

  async onApplicationBootstrap() {
	logger.error('>>> Entering onApplicationBootstrap()', { "event.action": "onApplicationBootstrap" });
    await this.loader.load(() => LazyModule);
	logger.warn('<<< Exiting onApplicationBootstrap()', { "event.action": "onApplicationBootstrap" });
  }
}
