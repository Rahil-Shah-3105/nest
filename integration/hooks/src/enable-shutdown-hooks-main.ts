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
	logger.debug(`>>> Entering beforeApplicationShutdown(signal=${signal})`);
    console.log('beforeApplicationShutdown ' + signal);
	logger.debug(`<<< Exiting beforeApplicationShutdown(signal=${signal})`);
  }

  onApplicationShutdown(signal: string) {
	logger.debug(`>>> Entering onApplicationShutdown(signal=${signal})`);
    console.log('onApplicationShutdown ' + signal);
	logger.debug(`<<< Exiting onApplicationShutdown(signal=${signal})`);
  }
}

@Module({
  providers: [TestInjectable],
})
class AppModule {}

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create(AppModule, { logger: false });

logger.debug(`bootstrap(): app → ${app}`);
  const shutdownOptions = USE_GRACEFUL_EXIT ? { useProcessExit: true } : {};

  if (SIGNAL_TO_LISTEN && SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([SIGNAL_TO_LISTEN], shutdownOptions);
  } else if (SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([], shutdownOptions);
  }

  await app.listen(1800);
  process.kill(process.pid, SIGNAL);
logger.debug('<<< Exiting bootstrap()');
}

void bootstrap();
