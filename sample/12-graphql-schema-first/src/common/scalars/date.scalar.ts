const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind } from 'graphql';

@Scalar('Date')
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: unknown): Date {
	logger.debug(`>>> Entering parseValue(value=${value})`);
	logger.debug(`<<< Exiting parseValue(value=${value})`);
    return new Date(value as number); // value from the client
  }

  serialize(value: unknown): number {
	logger.debug(`>>> Entering serialize(value=${value})`);
	logger.debug(`<<< Exiting serialize(value=${value})`);
    return (value as Date).getTime(); // value sent to the client
  }

  parseLiteral(ast: any): Date {
    if (ast.kind === Kind.INT) {
	logger.debug(`>>> Entering parseLiteral(ast=${ast})`);
	logger.debug(`<<< Exiting parseLiteral(ast=${ast})`);
      return new Date(ast.value);
    }
    return null!;
  }
}
