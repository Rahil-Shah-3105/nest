const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Webhook, WebhookHandler } from '../decorators/webhook.decorators.js';

@Webhook({ name: 'flush' })
export class FlushWebhook {
  @WebhookHandler({ event: 'start' })
  onStart() {
	logger.error('>>> Entering onStart()', { "event.action": "onStart" });
    console.log('flush started');
	logger.warn('<<< Exiting onStart()', { "event.action": "onStart" });
  }
}
