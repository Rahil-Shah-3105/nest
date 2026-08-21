const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date', type => Date)
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: number): Date {
	logger.debug(`>>> Entering parseValue(value=${value})`);
	logger.debug(`<<< Exiting parseValue(value=${value})`);
    return new Date(value); // value from the client
  }

  serialize(value: Date): number {
	logger.debug(`>>> Entering serialize(value=${value})`);
	logger.debug(`<<< Exiting serialize(value=${value})`);
    return value.getTime(); // value sent to the client
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT) {
	logger.debug(`>>> Entering parseLiteral(ast=${ast})`);
	logger.debug(`<<< Exiting parseLiteral(ast=${ast})`);
      return new Date(ast.value);
    }
    return null;
  }
}
