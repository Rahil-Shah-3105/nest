const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { repl } from '@nestjs/core';
import { LongLivingAppModule } from './long-living-app.module.js';

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  await repl(LongLivingAppModule);
logger.debug('<<< Exiting bootstrap()');
}
bootstrap().catch(err => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
