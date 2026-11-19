const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Scalar } from '@nestjs/graphql';
import { Kind } from 'graphql';

@Scalar('Date')
export class DateScalar {
  description = 'Date custom scalar type';

  parseValue(value) {
	logger.error(`>>> Entering parseValue(value=${value})`, { "event.action": "parseValue", "logrite.value": value });
	logger.warn(`<<< Exiting parseValue(value=${value})`, { "event.action": "parseValue", "logrite.value": value });
    return new Date(value); // value from the client
  }

  serialize(value) {
	logger.error(`>>> Entering serialize(value=${value})`, { "event.action": "serialize", "logrite.value": value });
	logger.warn(`<<< Exiting serialize(value=${value})`, { "event.action": "serialize", "logrite.value": value });
    return value.getTime(); // value sent to the client
  }

  parseLiteral(ast) {
	logger.error(`>>> Entering parseLiteral(ast=${ast})`, { "event.action": "parseLiteral", "logrite.ast": ast });
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    }
	logger.warn(`<<< Exiting parseLiteral(ast=${ast})`, { "event.action": "parseLiteral", "logrite.ast": ast });
    return null;
  }
}
