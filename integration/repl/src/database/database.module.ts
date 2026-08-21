const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseConnection } from './database.connection.js';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const connectionProvider = {
      provide: DatabaseConnection,
      useFactory: () => {
		logger.debug('>>> Entering forRoot()');
		logger.debug('<<< Exiting forRoot()');
        return DatabaseConnection.connect();
      },
    };
    return {
      global: true,
      module: DatabaseModule,
      providers: [connectionProvider],
      exports: [connectionProvider],
    };
  }
}
