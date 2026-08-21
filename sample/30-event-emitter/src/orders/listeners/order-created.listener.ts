const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '../events/order-created.event.js';

@Injectable()
export class OrderCreatedListener {
  @OnEvent('order.created')
  handleOrderCreatedEvent(event: OrderCreatedEvent) {
	logger.debug(`>>> Entering handleOrderCreatedEvent(event=${event})`);
    // handle and process "OrderCreatedEvent" event
    console.log(event);
	logger.debug(`<<< Exiting handleOrderCreatedEvent(event=${event})`);
  }
}
