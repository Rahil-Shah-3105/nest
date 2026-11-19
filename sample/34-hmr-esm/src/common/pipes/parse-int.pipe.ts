const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
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
	logger.warn(`<<< Exiting transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    return val;
  }
}
