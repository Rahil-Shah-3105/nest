const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
	logger.debug('>>> Entering connectToRedis()');
    const pubClient = createClient({
      url: `redis://localhost:6379`,
      clientInfoTag: this.getClientInfoTag(),
    });
    const subClient = pubClient.duplicate();
	logger.debug(`connectToRedis(): subClient → ${subClient}`);

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
	logger.debug('<<< Exiting connectToRedis()');
  }

  createIOServer(port: number, options?: ServerOptions): any {
	logger.debug(`>>> Entering createIOServer(port=${port},options=${options})`);
    const server = super.createIOServer(port, options);
	logger.debug(`createIOServer(port=${port},options=${options}): server → ${server}`);
    server.adapter(this.adapterConstructor);
	logger.debug(`<<< Exiting createIOServer(port=${port},options=${options})`);
    return server;
  }

  private getClientInfoTag(): string {
	logger.debug('>>> Entering getClientInfoTag()');
    try {
      // Try to get NestJS version from package.json
      const nestVersion = require('@nestjs/common/package.json').version;
	logger.debug(`getClientInfoTag(): nestVersion → ${nestVersion}`);
      return `nestjs_v${nestVersion}`;
    } catch {
	logger.error('Exception in getClientInfoTag()');
      // Fallback if version cannot be determined
	logger.debug('<<< Exiting getClientInfoTag()');
      return 'nestjs';
    }
  }
}
