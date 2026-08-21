const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseConnection implements OnModuleDestroy {
  keepAlive = true;

  static connect(): DatabaseConnection {
	logger.debug('>>> Entering connect()');
    const connection = new DatabaseConnection();
	logger.debug(`connect(): connection → ${connection}`);
    connection.maintainConnection();
	logger.debug('<<< Exiting connect()');
    return connection;
  }

  onModuleDestroy() {
	logger.debug('>>> Entering onModuleDestroy()');
    this.keepAlive = false;
	logger.debug(`onModuleDestroy(): this.keepAlive → ${this.keepAlive}`);
  }

  maintainConnection() {
	logger.debug('>>> Entering maintainConnection()');
    setTimeout(() => {
      if (this.keepAlive) {
        this.maintainConnection();
      }
    }, 10);
	logger.debug('<<< Exiting maintainConnection()');
  }
}
