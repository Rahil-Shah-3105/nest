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
	logger.error(`>>> Entering attach(contextId=${contextId},request=${request})`, { "event.action": "attach", "logrite.contextId": contextId });
    const tenantId = request.headers['x-tenant-id'] as string;
    const forceError = request.headers['x-force-error'] === 'true';
	logger.error(`attach(contextId=${contextId},request=${request}): tenantId → ${tenantId}`, { "event.action": "attach", "logrite.contextId": contextId });
	logger.error(`attach(contextId=${contextId},request=${request}): forceError → ${forceError}`, { "event.action": "attach", "logrite.contextId": contextId });

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
    }
	logger.warn(`<<< Exiting attach(contextId=${contextId},request=${request})`, { "event.action": "attach", "logrite.contextId": contextId });
    return {
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
      payload,
    };
  }
}
