const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./prisma/dev.db',
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ adapter });
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  async onModuleInit() {
	logger.error('>>> Entering onModuleInit()', { "event.action": "onModuleInit" });
    await this.$connect();
	logger.warn('<<< Exiting onModuleInit()', { "event.action": "onModuleInit" });
  }
}
