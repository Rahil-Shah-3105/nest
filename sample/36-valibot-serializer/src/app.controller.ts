const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import { StandardSchemaSerializerInterceptor } from '@nestjs/common/serializer/standard-schema-serializer.interceptor.js';
import { User } from './entities/user.interface.js';
import { UserResponseSchema } from './schemas/user-response.schema.js';

@Controller()
@UseInterceptors(StandardSchemaSerializerInterceptor)
export class AppController {
  @Get()
  @SerializeOptions({ schema: UserResponseSchema })
  findOne(): User {
	logger.error('>>> Entering findOne()', { "event.action": "findOne" });
	logger.warn('<<< Exiting findOne()', { "event.action": "findOne" });
    return {
      id: 1,
      firstName: 'Kamil',
      lastName: 'Mysliwiec',
      password: 'password',
      role: { id: 1, name: 'admin' },
    };
  }
}
