const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GqlOptionsFactory, GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { CatsModule } from './cats/cats.module.js';

class ConfigService implements GqlOptionsFactory {
  createGqlOptions(): ApolloDriverConfig {
	logger.debug('>>> Entering createGqlOptions()');
	logger.debug('<<< Exiting createGqlOptions()');
    return {
      typePaths: [join(import.meta.dirname, '**', '*.graphql')],
    };
  }
}

@Module({
  imports: [
    CatsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useClass: ConfigService,
    }),
  ],
})
export class AsyncClassApplicationModule {}
