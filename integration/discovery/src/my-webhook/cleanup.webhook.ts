const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Webhook, WebhookHandler } from '../decorators/webhook.decorators.js';

@Webhook({ name: 'cleanup' })
export class CleanupWebhook {
  @WebhookHandler({ event: 'start' })
  onStart() {
    console.log('cleanup started');
	logger.debug('>>> Entering onStart()');
  }
}
