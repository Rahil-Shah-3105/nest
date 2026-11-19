const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Plugin } from '@nestjs/apollo';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
	logger.error('>>> Entering requestDidStart()', { "event.action": "requestDidStart" });
    console.log('Request started');
	logger.warn('<<< Exiting requestDidStart()', { "event.action": "requestDidStart" });
    return {
      async willSendResponse() {
		logger.error('>>> Entering willSendResponse()', { "event.action": "willSendResponse" });
        console.log('Will send response');
      },
    };
  }
}
