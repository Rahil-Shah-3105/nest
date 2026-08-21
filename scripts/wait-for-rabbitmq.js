import amqp from 'amqplib';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const readPositiveInteger = (value, fallback) => {
logger.debug(`>>> Entering readPositiveInteger(value=${value},fallback=${fallback})`);
  const parsed = Number.parseInt(value, 10);
logger.debug(`readPositiveInteger(value=${value},fallback=${fallback}): parsed → ${parsed}`);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const timeoutMs = readPositiveInteger(
  process.env.RABBITMQ_WAIT_TIMEOUT_MS,
  60000,
);
const intervalMs = readPositiveInteger(
  process.env.RABBITMQ_WAIT_INTERVAL_MS,
  1000,
);
const startedAt = Date.now();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForRabbitMQ() {
logger.debug('>>> Entering waitForRabbitMQ()');
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const connection = await amqp.connect(url);
	logger.debug(`waitForRabbitMQ(): connection → ${connection}`);
      await connection.close();
      console.log(`[rabbitmq] Ready at ${url}`);
      return;
    } catch (err) {
      lastError = err;
      console.log(`[rabbitmq] Waiting for ${url}...`);
	logger.debug(`waitForRabbitMQ(): lastError → ${lastError}`);
      await sleep(intervalMs);
    }
  }

  console.error(
    `[rabbitmq] Timed out waiting for ${url} after ${timeoutMs}ms.`,
  );
  if (lastError) {
    console.error(lastError);
  }
logger.debug('<<< Exiting waitForRabbitMQ()');
  process.exit(1);
}

void waitForRabbitMQ();
