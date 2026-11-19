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
	logger.error(`>>> Entering transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    const val = parseInt(value, 10);
    if (isNaN(val)) {
	logger.error(`transform(value=${value},metadata=${metadata}): val → ${val}`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
