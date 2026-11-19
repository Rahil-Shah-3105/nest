const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseConnection implements OnModuleDestroy {
  keepAlive = true;

  static connect(): DatabaseConnection {
	logger.error('>>> Entering connect()', { "event.action": "connect" });
    const connection = new DatabaseConnection();
    connection.maintainConnection();
	logger.error(`connect(): connection → ${connection}`, { "event.action": "connect" });
	logger.warn('<<< Exiting connect()', { "event.action": "connect" });
    return connection;
  }

  onModuleDestroy() {
	logger.error('>>> Entering onModuleDestroy()', { "event.action": "onModuleDestroy" });
    this.keepAlive = false;
	logger.debug(`onModuleDestroy(): this.keepAlive → ${this.keepAlive}`, { "event.action": "onModuleDestroy" });
  }

  maintainConnection() {
	logger.error('>>> Entering maintainConnection()', { "event.action": "maintainConnection" });
    setTimeout(() => {
      if (this.keepAlive) {
        this.maintainConnection();
      }
    }, 10);
	logger.warn('<<< Exiting maintainConnection()', { "event.action": "maintainConnection" });
  }
}
