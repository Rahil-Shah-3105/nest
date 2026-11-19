const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory } from '@nestjs/graphql';
import { join } from 'path';

@Injectable()
export class ConfigService implements GqlOptionsFactory {
  createGqlOptions(): GqlModuleOptions {
	logger.error('>>> Entering createGqlOptions()', { "event.action": "createGqlOptions" });
	logger.warn('<<< Exiting createGqlOptions()', { "event.action": "createGqlOptions" });
    return {
      typePaths: [join(import.meta.dirname, '**', '*.graphql')],
    };
  }
}
