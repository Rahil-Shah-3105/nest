const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { repl } from '@nestjs/core';
import { LongLivingAppModule } from './long-living-app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  await repl(LongLivingAppModule);
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}
bootstrap().catch(err => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
