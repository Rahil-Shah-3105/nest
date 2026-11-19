const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  BeforeApplicationShutdown,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
const SIGNAL = process.argv[2];
const SIGNAL_TO_LISTEN = process.argv[3];
const USE_GRACEFUL_EXIT = process.argv[4] === 'graceful';

@Injectable()
class TestInjectable
  implements OnApplicationShutdown, BeforeApplicationShutdown
{
  beforeApplicationShutdown(signal: string) {
	logger.error(`>>> Entering beforeApplicationShutdown(signal=${signal})`, { "event.action": "beforeApplicationShutdown", "logrite.signal": signal });
    console.log('beforeApplicationShutdown ' + signal);
	logger.warn(`<<< Exiting beforeApplicationShutdown(signal=${signal})`, { "event.action": "beforeApplicationShutdown", "logrite.signal": signal });
  }

  onApplicationShutdown(signal: string) {
	logger.error(`>>> Entering onApplicationShutdown(signal=${signal})`, { "event.action": "onApplicationShutdown", "logrite.signal": signal });
    console.log('onApplicationShutdown ' + signal);
	logger.warn(`<<< Exiting onApplicationShutdown(signal=${signal})`, { "event.action": "onApplicationShutdown", "logrite.signal": signal });
  }
}

@Module({
  providers: [TestInjectable],
})
class AppModule {}

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(AppModule, { logger: false });

logger.error(`bootstrap(): app → ${app}`, { "event.action": "bootstrap" });
  const shutdownOptions = USE_GRACEFUL_EXIT ? { useProcessExit: true } : {};

  if (SIGNAL_TO_LISTEN && SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([SIGNAL_TO_LISTEN], shutdownOptions);
  } else if (SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([], shutdownOptions);
  }

  await app.listen(1800);
  process.kill(process.pid, SIGNAL);
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}

void bootstrap();
