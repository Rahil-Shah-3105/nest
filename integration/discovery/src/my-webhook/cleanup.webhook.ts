const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Webhook, WebhookHandler } from '../decorators/webhook.decorators.js';

@Webhook({ name: 'cleanup' })
export class CleanupWebhook {
  @WebhookHandler({ event: 'start' })
  onStart() {
	logger.error('>>> Entering onStart()', { "event.action": "onStart" });
    console.log('cleanup started');
	logger.warn('<<< Exiting onStart()', { "event.action": "onStart" });
  }
}
