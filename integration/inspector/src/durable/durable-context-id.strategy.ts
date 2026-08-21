const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ContextId, ContextIdStrategy, HostComponentInfo } from '@nestjs/core';
import { Request } from 'express';

const tenants = new Map<string, ContextId>();

export class DurableContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request) {
	logger.debug(`>>> Entering attach(contextId=${contextId},request=${request})`);
    const tenantId = request.headers['x-tenant-id'] as string;
    let tenantSubTreeId: ContextId;
	logger.debug(`attach(contextId=${contextId},request=${request}): tenantId → ${tenantId}`);

    if (tenants.has(tenantId)) {
      tenantSubTreeId = tenants.get(tenantId);
    } else {
      tenantSubTreeId = { id: +tenantId } as ContextId;
      tenants.set(tenantId, tenantSubTreeId);
    }
	logger.debug(`<<< Exiting attach(contextId=${contextId},request=${request})`);
    return {
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
      payload: { tenantId },
    };
  }
}
