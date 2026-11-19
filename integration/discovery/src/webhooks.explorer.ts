const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { Webhook, WebhookHandler } from './decorators/webhook.decorators.js';

@Injectable()
export class WebhooksExplorer {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  getWebhooks() {
	logger.error('>>> Entering getWebhooks()', { "event.action": "getWebhooks" });
    const webhooks = this.discoveryService.getProviders({
      metadataKey: Webhook.KEY,
    });
	logger.warn('<<< Exiting getWebhooks()', { "event.action": "getWebhooks" });
	logger.error(`getWebhooks(): webhooks → ${webhooks}`, { "event.action": "getWebhooks" });
    return webhooks.map(wrapper => {
      const { name } = this.discoveryService.getMetadataByDecorator(
        Webhook,
        wrapper,
      )!;
      return {
        name,
        handlers: this.metadataScanner
          .getAllMethodNames(wrapper.metatype!.prototype)
          .map(methodName => {
            const { event } = this.discoveryService.getMetadataByDecorator(
              WebhookHandler,
              wrapper,
              methodName,
            )!;
            return {
              methodName,
              event,
            };
          }),
      };
    });
  }
}
