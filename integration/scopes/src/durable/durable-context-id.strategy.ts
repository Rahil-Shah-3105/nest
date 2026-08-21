const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ContextId, ContextIdStrategy, HostComponentInfo } from '@nestjs/core';
import { Request } from 'express';

export type TenantContext = {
  tenantId: string;
  forceError?: boolean;
};

const tenants = new Map<string, ContextId>();

export class DurableContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request) {
	logger.debug(`>>> Entering attach(contextId=${contextId},request=${request})`);
    const tenantId = request.headers['x-tenant-id'] as string;
    const forceError = request.headers['x-force-error'] === 'true';
	logger.debug(`attach(contextId=${contextId},request=${request}): tenantId → ${tenantId}`);
	logger.debug(`attach(contextId=${contextId},request=${request}): forceError → ${forceError}`);

    let tenantSubTreeId: ContextId;

    if (tenants.has(tenantId)) {
      tenantSubTreeId = tenants.get(tenantId)!;
    } else {
      tenantSubTreeId = { id: +tenantId } as ContextId;
      tenants.set(tenantId, tenantSubTreeId);
    }

    const payload: TenantContext = { tenantId };
    if (forceError) {
      payload.forceError = true;
	logger.debug(`attach(contextId=${contextId},request=${request}): payload.forceError → ${payload.forceError}`);
    }
	logger.debug(`<<< Exiting attach(contextId=${contextId},request=${request})`);
    return {
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
      payload,
    };
  }
}
