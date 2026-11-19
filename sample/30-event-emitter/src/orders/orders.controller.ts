const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
	logger.error(`>>> Entering create(createOrderDto=${createOrderDto})`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
	logger.warn(`<<< Exiting create(createOrderDto=${createOrderDto})`, { "event.action": "create", "logrite.createOrderDto": createOrderDto });
    return this.ordersService.create(createOrderDto);
  }
}
