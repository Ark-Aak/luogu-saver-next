import { ChildrenValues } from '@/workers/types';
import { logger } from '@/lib/logger';

export function shouldSkip(childrenValues: ChildrenValues) {
    const childrenKeys = Object.keys(childrenValues);
    for (const key of childrenKeys) {
        const upstreamData = childrenValues[key];
        if (upstreamData && upstreamData.skipNextStep) {
            return true;
        }
    }
    return false;
}

type PredicateFunction = (data: any) => boolean;

export function extractUpsteamData(
    childrenValues: ChildrenValues,
    predicate: PredicateFunction,
    jobId?: string
) {
    const childKeys = Object.keys(childrenValues);
    for (const childKey of childKeys) {
        const upstreamData = childrenValues[childKey];
        if (upstreamData && predicate(upstreamData.data)) {
            const result = upstreamData.data;
            logger.info({ jobId }, `Using upstream data from workflow`);
            return result;
        }
    }
    return null;
}
