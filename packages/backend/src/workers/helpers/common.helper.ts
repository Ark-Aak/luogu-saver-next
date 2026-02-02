import { ChildrenValues } from '@/workers/types';
import { ArticleService } from '@/services/article.service';
import { PasteService } from '@/services/paste.service';
import { WorkflowDataSource } from '@/shared/workflow';
import { Article } from '@/entities/article';
import { Paste } from '@/entities/paste';
import { UnrecoverableError } from 'bullmq';
import { logger } from '@/lib/logger';

type SourceType = {
    [WorkflowDataSource.ARTICLE]: Article;
    [WorkflowDataSource.PASTE]: Paste;
};

export function shouldSkip(childrenValues: ChildrenValues) {
    const childrenKeys = Object.keys(childrenValues);
    for (const key of childrenKeys) {
        const upstreamData = childrenValues[key];
        if (upstreamData && upstreamData.skipNextStep) {
            return true;
        }
    }
}

export function parseSourceId(sourceId: string) {
    const parts = sourceId.split(':');
    if (parts.length !== 2) {
        throw new UnrecoverableError(`Invalid sourceId format: ${sourceId}`);
    }
    const [type, id] = parts;
    if (!Object.values(WorkflowDataSource).includes(type as WorkflowDataSource)) {
        throw new UnrecoverableError(`Invalid source type: ${type}`);
    }
    const newType = type as WorkflowDataSource;
    return { type: newType, id };
}

/*
 * Given a sourceId, return the corresponding source object.
 * The sourceId is in the format of "<type>:<id>", where <type> can be "article", "paste", etc.
 * This function parses the sourceId and retrieves the source object from the database or service.
 * If the source type is not recognized, it throws an error.
 * @param sourceId - The source identifier string.
 * @returns The source object corresponding to the sourceId.
 * @throws Error if the source type is not recognized or unavailable.
 */
export async function getSource<T extends keyof SourceType>(
    type: T,
    id: string
): Promise<SourceType[T] | null> {
    switch (type) {
        case WorkflowDataSource.ARTICLE:
            return (await ArticleService.getArticleByIdWithoutCache(id)) as SourceType[T];
        case WorkflowDataSource.PASTE:
            return (await PasteService.getPasteByIdWithoutCache(id)) as SourceType[T];
        default:
            throw new UnrecoverableError(`Source type ${type} is not recognized or unavailable.`);
    }
}

export async function getSourceTextById(sourceId: string, jobId: string | undefined) {
    const { type, id } = parseSourceId(sourceId);
    const data = await getSource(type, id);
    if (data) {
        logger.info({ jobId }, `Using source data from ${type} for summary`);
        return data.content;
    } else {
        throw new UnrecoverableError(`Invalid sourceId in job ${jobId}`);
    }
}
