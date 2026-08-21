const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Scalar } from '@nestjs/graphql';
import { Kind } from 'graphql';

@Scalar('Date')
export class DateScalar {
  description = 'Date custom scalar type';

  parseValue(value) {
	logger.debug(`>>> Entering parseValue(value=${value})`);
	logger.debug(`<<< Exiting parseValue(value=${value})`);
    return new Date(value); // value from the client
  }

  serialize(value) {
	logger.debug(`>>> Entering serialize(value=${value})`);
	logger.debug(`<<< Exiting serialize(value=${value})`);
    return value.getTime(); // value sent to the client
  }

  parseLiteral(ast) {
	logger.debug(`>>> Entering parseLiteral(ast=${ast})`);
    if (ast.kind === Kind.INT) {
	logger.debug(`<<< Exiting parseLiteral(ast=${ast})`);
      return parseInt(ast.value, 10); // ast value is always in string format
    }
    return null;
  }
}
