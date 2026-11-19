const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from '../orders/entities/order.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderCreatedEvent } from './events/order-created.event.js';

@Injectable()
export class OrdersService {
  public orders: Order[] = [
    {
      id: 1,
      name: 'Order #1',
      description: 'Description order #1',
    },
    {
      id: 2,
      name: 'Order #2',
      description: 'Description order #2',
    },
  ];

  constructor(private eventEmitter: EventEmitter2) {}

  create(createOrderDto: CreateOrderDto) {
	logger.error(`>>> Entering create(createOrderDto=${createOrderDto})`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
    const order = {
      id: this.orders.length + 1,
      ...createOrderDto,
    };
    this.orders.push(order);

    const orderCreatedEvent = new OrderCreatedEvent();
	logger.error(`create(createOrderDto=${createOrderDto}): orderCreatedEvent → ${orderCreatedEvent}`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
    orderCreatedEvent.name = order.name;
	logger.debug(`create(createOrderDto=${createOrderDto}): orderCreatedEvent.name → ${orderCreatedEvent.name}`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
    orderCreatedEvent.description = order.description;
	logger.debug(`create(createOrderDto=${createOrderDto}): orderCreatedEvent.description → ${orderCreatedEvent.description}`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
    this.eventEmitter.emit('order.created', orderCreatedEvent);

	logger.warn(`<<< Exiting create(createOrderDto=${createOrderDto})`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
    return order;
  }
}
