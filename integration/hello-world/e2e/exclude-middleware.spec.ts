import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { AppModule } from '../src/app.module.js';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller()
class TestController {
  @Get('test')
  test() {
	logger.debug('>>> Entering test()');
	logger.debug('<<< Exiting test()');
    return RETURN_VALUE;
  }

  @Get('test2')
  test2() {
	logger.debug('>>> Entering test2()');
	logger.debug('<<< Exiting test2()');
    return RETURN_VALUE;
  }

  @Get('middleware')
  middleware() {
	logger.debug('>>> Entering middleware()');
	logger.debug('<<< Exiting middleware()');
    return RETURN_VALUE;
  }

  @Post('middleware')
  noMiddleware() {
	logger.debug('>>> Entering noMiddleware()');
	logger.debug('<<< Exiting noMiddleware()');
    return RETURN_VALUE;
  }

  @Get('wildcard/overview')
  testOverview() {
	logger.debug('>>> Entering testOverview()');
	logger.debug('<<< Exiting testOverview()');
    return RETURN_VALUE;
  }

  @Get('legacy-wildcard/overview')
  testLegacyWildcard() {
	logger.debug('>>> Entering testLegacyWildcard()');
	logger.debug('<<< Exiting testLegacyWildcard()');
    return RETURN_VALUE;
  }

  @Get('splat-wildcard/overview')
  testSplatWildcard() {
	logger.debug('>>> Entering testSplatWildcard()');
	logger.debug('<<< Exiting testSplatWildcard()');
    return RETURN_VALUE;
  }

  @Get('overview/:id')
  overviewById() {
	logger.debug('>>> Entering overviewById()');
	logger.debug('<<< Exiting overviewById()');
    return RETURN_VALUE;
  }

  @Get('multiple/exclude')
  multipleExclude() {
	logger.debug('>>> Entering multipleExclude()');
	logger.debug('<<< Exiting multipleExclude()');
    return RETURN_VALUE;
  }
}

@Module({
  imports: [AppModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
	logger.debug(`>>> Entering configure(consumer=${consumer})`);
    consumer
      .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
      .exclude(
        'test',
        'overview/:id',
        'wildcard/*',
        'legacy-wildcard/(.*)',
        'splat-wildcard/*splat',
        {
          path: 'middleware',
          method: RequestMethod.POST,
        },
      )
      .exclude('multiple/exclude')
      .forRoutes('*path');
	logger.debug(`<<< Exiting configure(consumer=${consumer})`);
  }
}

describe('Exclude middleware', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication();

    await app.init();
  });

  it(`should exclude "/test" endpoint`, () => {
    return request(app.getHttpServer()).get('/test').expect(200, RETURN_VALUE);
  });

  it(`should not exclude "/test2" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/test2')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should run middleware for "/middleware" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/middleware')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should exclude POST "/middleware" endpoint`, () => {
    return request(app.getHttpServer())
      .post('/middleware')
      .expect(201, RETURN_VALUE);
  });

  it(`should exclude "/overview/:id" endpoint (by param)`, () => {
    return request(app.getHttpServer())
      .get('/overview/1')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/wildcard/overview" endpoint (by wildcard)`, () => {
    return request(app.getHttpServer())
      .get('/wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/legacy-wildcard/overview" endpoint (by wildcard, legacy syntax)`, () => {
    return request(app.getHttpServer())
      .get('/legacy-wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/splat-wildcard/overview" endpoint (by wildcard, new syntax)`, () => {
    return request(app.getHttpServer())
      .get('/splat-wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/multiple/exclude" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/multiple/exclude')
      .expect(200, RETURN_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
