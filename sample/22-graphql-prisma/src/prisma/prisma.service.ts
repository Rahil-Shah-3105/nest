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
	logger.debug('>>> Entering constructor()');
	logger.debug('<<< Exiting constructor()');
  }

  async onModuleInit() {
	logger.debug('>>> Entering onModuleInit()');
    await this.$connect();
	logger.debug('<<< Exiting onModuleInit()');
  }
}
