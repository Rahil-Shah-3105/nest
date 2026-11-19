const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
	logger.error('>>> Entering connectToRedis()', { "event.action": "connectToRedis" });
    const pubClient = createClient({
      url: `redis://localhost:6379`,
      clientInfoTag: this.getClientInfoTag(),
    });
    const subClient = pubClient.duplicate();
	logger.error(`connectToRedis(): subClient → ${subClient}`, { "event.action": "connectToRedis" });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
	logger.warn('<<< Exiting connectToRedis()', { "event.action": "connectToRedis" });
  }

  createIOServer(port: number, options?: ServerOptions): any {
	logger.error(`>>> Entering createIOServer(port=${port},options=${options})`, { "event.action": "createIOServer", "logrite.port": port, "logrite.options": options });
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
	logger.error(`createIOServer(port=${port},options=${options}): server → ${server}`, { "event.action": "createIOServer", "logrite.port": port, "logrite.options": options });
	logger.warn(`<<< Exiting createIOServer(port=${port},options=${options})`, { "event.action": "createIOServer", "logrite.port": port, "logrite.options": options });
    return server;
  }

  private getClientInfoTag(): string {
	logger.error('>>> Entering getClientInfoTag()', { "event.action": "getClientInfoTag" });
    try {
      // Try to get NestJS version from package.json
      const nestVersion = require('@nestjs/common/package.json').version;
	logger.error(`getClientInfoTag(): nestVersion → ${nestVersion}`, { "event.action": "getClientInfoTag" });
      return `nestjs_v${nestVersion}`;
    } catch {
	logger.error('Exception in getClientInfoTag()', { "event.action": "getClientInfoTag", "event.category": "process" });
      // Fallback if version cannot be determined
	logger.warn('<<< Exiting getClientInfoTag()', { "event.action": "getClientInfoTag" });
      return 'nestjs';
    }
  }
}
