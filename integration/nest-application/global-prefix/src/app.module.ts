const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller.js';

export const MIDDLEWARE_VALUE = 'middleware';
export const MIDDLEWARE_PARAM_VALUE = 'middleware_param';

@Module({
  controllers: [AppController],
})
export class AppModule {
  private count = 0;
  configure(consumer: MiddlewareConsumer) {
	logger.debug(`>>> Entering configure(consumer=${consumer})`);
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .forRoutes({ path: MIDDLEWARE_VALUE, method: RequestMethod.GET })
      .apply((req, res, next) => res.status(201).end(MIDDLEWARE_VALUE))
      .forRoutes({ path: MIDDLEWARE_VALUE, method: RequestMethod.POST })
      .apply((req, res, next) => res.end(MIDDLEWARE_PARAM_VALUE))
      .forRoutes({
        path: MIDDLEWARE_VALUE + '/*path',
        method: RequestMethod.GET,
      })
      .apply((req, res, next) => res.status(201).end(MIDDLEWARE_PARAM_VALUE))
      .forRoutes({
        path: MIDDLEWARE_VALUE + '/*path',
        method: RequestMethod.POST,
      })
      .apply((req, res, next) => {
        req.extras = { data: 'Data attached in middleware' };
		logger.debug(`configure(consumer=${consumer}): req.extras → ${req.extras}`);
        next();
      })
      .forRoutes({ path: '*path', method: RequestMethod.GET })
      .apply((req, res, next) => {
        req.middlewareParams = req.params;
		logger.debug(`configure(consumer=${consumer}): req.middlewareParams → ${req.middlewareParams}`);
        next();
      })
      .forRoutes({ path: '*path', method: RequestMethod.GET })
      .apply((req, res, next) => {
        this.count += 1;
        req.count = this.count;
		logger.debug(`configure(consumer=${consumer}): req.count → ${req.count}`);
        next();
      })
      .forRoutes('*path');
	logger.debug(`<<< Exiting configure(consumer=${consumer})`);
  }
}
