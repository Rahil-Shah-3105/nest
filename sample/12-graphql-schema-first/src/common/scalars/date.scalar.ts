const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind } from 'graphql';

@Scalar('Date')
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: unknown): Date {
	logger.error(`>>> Entering parseValue(value=${value})`, { "event.action": "parseValue", "logrite.value": value });
	logger.warn(`<<< Exiting parseValue(value=${value})`, { "event.action": "parseValue", "logrite.value": value });
    return new Date(value as number); // value from the client
  }

  serialize(value: unknown): number {
	logger.error(`>>> Entering serialize(value=${value})`, { "event.action": "serialize", "logrite.value": value });
	logger.warn(`<<< Exiting serialize(value=${value})`, { "event.action": "serialize", "logrite.value": value });
    return (value as Date).getTime(); // value sent to the client
  }

  parseLiteral(ast: any): Date {
	logger.error(`>>> Entering parseLiteral(ast=${ast})`, { "event.action": "parseLiteral", "logrite.ast": ast });
    if (ast.kind === Kind.INT) {
      return new Date(ast.value);
    }
	logger.warn(`<<< Exiting parseLiteral(ast=${ast})`, { "event.action": "parseLiteral", "logrite.ast": ast });
    return null!;
  }
}
