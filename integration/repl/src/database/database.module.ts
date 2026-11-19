const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseConnection } from './database.connection.js';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
	logger.error('>>> Entering forRoot()', { "event.action": "forRoot" });
    const connectionProvider = {
      provide: DatabaseConnection,
      useFactory: () => {
        return DatabaseConnection.connect();
      },
    };
	logger.warn('<<< Exiting forRoot()', { "event.action": "forRoot" });
    return {
      global: true,
      module: DatabaseModule,
      providers: [connectionProvider],
      exports: [connectionProvider],
    };
  }
}
