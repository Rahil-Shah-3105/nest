const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(private gqlSchemaHost: GraphQLSchemaHost) {}

  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
	logger.error('>>> Entering requestDidStart()', { "event.action": "requestDidStart" });
    const { schema } = this.gqlSchemaHost;

    return {
      async didResolveOperation({ request, document }) {
		logger.error('>>> Entering didResolveOperation()', { "event.action": "didResolveOperation" });
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });
        if (complexity >= 20) {
          throw new GraphQLError(
            `Query is too complex: ${complexity}. Maximum allowed complexity: 20`,
          );
        }
        console.log('Query Complexity:', complexity);
		logger.warn('<<< Exiting didResolveOperation()', { "event.action": "didResolveOperation" });
      },
    };
	logger.warn('<<< Exiting requestDidStart()', { "event.action": "requestDidStart" });
  }
}
