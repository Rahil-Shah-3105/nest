const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  BadRequestException,
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata) {
	logger.debug(`>>> Entering transform(value=${value},metadata=${metadata})`);
    const val = parseInt(value, 10);
    if (isNaN(val)) {
	logger.debug(`transform(value=${value},metadata=${metadata}): val → ${val}`);
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
