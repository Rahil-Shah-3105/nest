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
	logger.debug(`>>> Entering transform(value=${value},metadata=${metadata})`);
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
	logger.debug(`transform(value=${value},metadata=${metadata}): object → ${object}`);
    const errors = await validate(object);
    if (errors.length > 0) {
	logger.debug(`transform(value=${value},metadata=${metadata}): errors → ${errors}`);
      throw new BadRequestException('Validation failed');
    }
    return value;
  }

  private toValidate(metatype: Type<any>): boolean {
	logger.debug(`>>> Entering toValidate(metatype=${metatype})`);
    const types = [String, Boolean, Number, Array, Object];
	logger.debug(`<<< Exiting toValidate(metatype=${metatype})`);
    return !types.find(type => metatype === type);
  }
}
