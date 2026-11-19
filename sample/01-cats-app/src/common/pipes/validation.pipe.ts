const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: ArgumentMetadata) {
	logger.error(`>>> Entering transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
	logger.error(`transform(value=${value},metadata=${metadata}): object → ${object}`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    const errors = await validate(object);
    if (errors.length > 0) {
	logger.error(`transform(value=${value},metadata=${metadata}): errors → ${errors}`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
      throw new BadRequestException('Validation failed');
    }
	logger.warn(`<<< Exiting transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    return value;
  }

  private toValidate(metatype: Type<any>): boolean {
	logger.error(`>>> Entering toValidate(metatype=${metatype})`, { "event.action": "toValidate", "logrite.metatype": metatype });
    const types = [String, Boolean, Number, Array, Object];
	logger.warn(`<<< Exiting toValidate(metatype=${metatype})`, { "event.action": "toValidate", "logrite.metatype": metatype });
    return !types.find(type => metatype === type);
  }
}
