const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Webhook, WebhookHandler } from '../decorators/webhook.decorators.js';

@Webhook({ name: 'flush' })
export class FlushWebhook {
  @WebhookHandler({ event: 'start' })
  onStart() {
    console.log('flush started');
	logger.debug('>>> Entering onStart()');
  }
}
