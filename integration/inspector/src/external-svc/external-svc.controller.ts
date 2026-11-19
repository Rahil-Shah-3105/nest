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
	logger.error(`>>> Entering create(createExternalSvcDto=${createExternalSvcDto})`, { "event.action": "create", "logrite.createExternalSvcDto": createExternalSvcDto });
	logger.warn(`<<< Exiting create(createExternalSvcDto=${createExternalSvcDto})`, { "event.action": "create", "logrite.createExternalSvcDto": createExternalSvcDto });
    return this.externalSvcService.create(createExternalSvcDto);
  }

  @MessagePattern('findAllExternalSvc')
  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.externalSvcService.findAll();
  }

  @MessagePattern('findOneExternalSvc')
  findOne(@Payload() id: number) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.externalSvcService.findOne(id);
  }

  @MessagePattern('updateExternalSvc')
  update(@Payload() updateExternalSvcDto: UpdateExternalSvcDto) {
	logger.error(`>>> Entering update(updateExternalSvcDto=${updateExternalSvcDto})`, { "event.action": "update", "logrite.updateExternalSvcDto": updateExternalSvcDto });
	logger.warn(`<<< Exiting update(updateExternalSvcDto=${updateExternalSvcDto})`, { "event.action": "update", "logrite.updateExternalSvcDto": updateExternalSvcDto });
    return this.externalSvcService.update(
      updateExternalSvcDto.id,
      updateExternalSvcDto,
    );
  }

  @MessagePattern('removeExternalSvc')
  remove(@Payload() id: number) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return this.externalSvcService.remove(id);
  }
}
