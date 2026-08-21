const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Plugin } from '@nestjs/apollo';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    console.log('Request started');
	logger.debug('>>> Entering requestDidStart()');
	logger.debug('<<< Exiting requestDidStart()');
    return {
      async willSendResponse() {
		logger.debug('>>> Entering willSendResponse()');
        console.log('Will send response');
      },
    };
  }
}
