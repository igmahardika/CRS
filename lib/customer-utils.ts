import { extractNodeFromServiceId } from './service-utils';
import { getSlaByServiceName } from './service-sla';

export interface CustomerDefaults {
  nodeCount: number;
  targetSla: number;
}

/**
 * Calculates default nodeCount and targetSla from serviceId and serviceName.
 */
export function resolveCustomerDefaults(
  serviceId: string | null | undefined,
  serviceName: string | null | undefined
): CustomerDefaults {
  const nodeCount = extractNodeFromServiceId(serviceId);
  const slaMatch = getSlaByServiceName(serviceName);
  return {
    nodeCount,
    targetSla: slaMatch.hasSla ? slaMatch.targetSla : 99.5,
  };
}

export { extractNodeFromServiceId, getSlaByServiceName };

