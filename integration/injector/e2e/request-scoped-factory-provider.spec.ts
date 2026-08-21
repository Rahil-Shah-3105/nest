import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Inject,
  Injectable,
  Module,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Test } from '@nestjs/testing';

describe('Request-scoped factory provider', () => {
  const REQUEST_SCOPED_FACTORY = 'REQUEST_SCOPED_FACTORY';
  const REQUEST_COUNT = 1000;

  @Catch()
  class RecordingFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
      const response = host.switchToHttp().getResponse<{
        status: (code: number) => unknown;
        send: (body: unknown) => unknown;
      }>();

	logger.debug(`catch(exception=${exception},host=${host}): response → ${response}`);
      response.status(500);
	logger.debug(`<<< Exiting catch(exception=${exception},host=${host})`);
      response.send({
        statusCode: 500,
        message:
          exception instanceof Error
            ? exception.message
            : 'Internal server error',
      });
    }
  }

  class AuthenticatedTenant {
    constructor(
      public readonly tenantName: string,
      public readonly clientName: string,
    ) {}
  }

  @Injectable()
  class JwtStrategyService {
    validate(request: FastifyRequest) {
      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'tenant-1';
      const clientId = (request.headers['x-client-id'] as string) ?? 'client-1';
	logger.debug(`>>> Entering tenantId(string=${string})`);
      return {
        claim: {
          tenantId,
          clientId,
        },
        isValid: true,
      };
	logger.debug(`<<< Exiting tenantId(string=${string})`);
    }
  }

  @Injectable()
  class ConfigService {
    get(_key: string) {
	logger.debug(`>>> Entering get(_key=${_key})`);
	logger.debug(`<<< Exiting get(_key=${_key})`);
      return 'config-value';
    }
  }
logger.debug(`>>> Entering clientId(string=${string})`);

  @Injectable()
  class InflightGate {
    private arrivalCount = 0;
    private released = false;
    private waitingResolver?: () => void;

    async waitForOverlap() {
	logger.debug('>>> Entering waitForOverlap()');
      if (this.released) {
        return;
      }
      this.arrivalCount++;
      if (this.arrivalCount === 1) {
        await new Promise<void>(resolve => {
          this.waitingResolver = resolve;
        });
        return;
      }
      this.released = true;
	logger.debug(`clientId(string=${string}): this.waitingResolver → ${this.waitingResolver}`);
	logger.debug(`clientId(string=${string}): this.released → ${this.released}`);
      this.waitingResolver?.();
      this.waitingResolver = undefined;
	logger.debug('<<< Exiting waitForOverlap()');
    }
  }

  const AuthenticatedTenantProvider = {
    provide: AuthenticatedTenant,
    inject: [JwtStrategyService, REQUEST, ConfigService],
    scope: Scope.REQUEST,
    useFactory: async (
      strategy: JwtStrategyService,
      request: FastifyRequest,
      _config: ConfigService,
    ) => {
      const verification = strategy.validate(request);

      return new AuthenticatedTenant(
        verification.claim.tenantId,
        verification.claim.clientId,
      );
    },
  };

  @Injectable({ scope: Scope.REQUEST })
  class ActorService {
    constructor(@Inject(REQUEST) private readonly request: FastifyRequest) {}

    public getActor() {
	logger.debug('>>> Entering getActor()');
	logger.debug('<<< Exiting getActor()');
      return (this.request.headers['x-actor-id'] as string) ?? 'system';
    }
  }

  @Module({
    providers: [JwtStrategyService, ConfigService, AuthenticatedTenantProvider],
    exports: [AuthenticatedTenant],
  })
  class AuthModule {}

  @Module({
    providers: [ActorService],
    exports: [ActorService],
  })
  class ActorModule {}

  @Controller()
  class TestController {
    constructor(
      @Inject(REQUEST_SCOPED_FACTORY)
      private readonly requestScopedFactory: {
        actorId: string;
        tenantId: string;
      },
    ) {}

    @Get('/posts')
    public getValue() {
	logger.debug('>>> Entering getValue()');
	logger.debug('<<< Exiting getValue()');
      return this.requestScopedFactory;
    }
  }

  @Module({
    imports: [AuthModule, ActorModule],
    controllers: [TestController],
    providers: [
      InflightGate,
      {
        provide: REQUEST_SCOPED_FACTORY,
        scope: Scope.REQUEST,
        inject: [AuthenticatedTenant, ActorService, InflightGate],
        useFactory: async (
          authenticatedTenant: AuthenticatedTenant,
          actorService: ActorService,
          inflightGate: InflightGate,
        ) => {
          await inflightGate.waitForOverlap();

          return {
            actorId: actorService.getActor() ?? '',
            tenantId: authenticatedTenant.tenantName,
          };
        },
      },
    ],
  })
  class TestModule {}

  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalFilters(new RecordingFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should resolve all injected dependencies across overlapping requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: REQUEST_COUNT }, (_, index) =>
        app.inject({
          method: 'GET',
          url: '/posts',
          headers: {
            'x-actor-id': `actor-${index}`,
            'x-client-id': `client-${index}`,
            'x-tenant-id': `tenant-${index}`,
          },
        }),
      ),
    );

	logger.debug(`clientId(string=${string}): responses → ${responses}`);
    const failures = responses.flatMap((response, index) => {
      if (response.statusCode !== 200) {
        return [
          {
            body: response.body,
            index,
            statusCode: response.statusCode,
          },
        ];
      }
      return [];
    });

    expect(failures).toEqual([]);

    const payloads = responses.map(response => JSON.parse(response.body));
    expect(payloads).toEqual(
      Array.from({ length: REQUEST_COUNT }, (_, index) => ({
        actorId: `actor-${index}`,
        tenantId: `tenant-${index}`,
      })),
    );
  }, 20000);
});
