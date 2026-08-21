const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateExternalSvcDto } from './dto/create-external-svc.dto.js';
import { UpdateExternalSvcDto } from './dto/update-external-svc.dto.js';
import { ExternalSvcService } from './external-svc.service.js';

@Controller()
export class ExternalSvcController {
  constructor(private readonly externalSvcService: ExternalSvcService) {}

  @MessagePattern('createExternalSvc')
  create(@Payload() createExternalSvcDto: CreateExternalSvcDto) {
	logger.debug(`>>> Entering create(createExternalSvcDto=${createExternalSvcDto})`);
	logger.debug(`<<< Exiting create(createExternalSvcDto=${createExternalSvcDto})`);
    return this.externalSvcService.create(createExternalSvcDto);
  }

  @MessagePattern('findAllExternalSvc')
  findAll() {
	logger.debug('>>> Entering findAll()');
    return this.externalSvcService.findAll();
  }

  @MessagePattern('findOneExternalSvc')
  findOne(@Payload() id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.externalSvcService.findOne(id);
  }

  @MessagePattern('updateExternalSvc')
  update(@Payload() updateExternalSvcDto: UpdateExternalSvcDto) {
	logger.debug(`>>> Entering update(updateExternalSvcDto=${updateExternalSvcDto})`);
	logger.debug(`<<< Exiting update(updateExternalSvcDto=${updateExternalSvcDto})`);
    return this.externalSvcService.update(
      updateExternalSvcDto.id,
      updateExternalSvcDto,
    );
  }

  @MessagePattern('removeExternalSvc')
  remove(@Payload() id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return this.externalSvcService.remove(id);
  }
}
