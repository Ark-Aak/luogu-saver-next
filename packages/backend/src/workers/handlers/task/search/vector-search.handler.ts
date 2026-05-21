import { Job, UnrecoverableError } from 'bullmq';
import { SearchTask } from '@/shared/task';
import { ChildrenValues, TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { extractUpsteamData, shouldSkip } from '@/workers/helpers/common.helper';
import { EmbeddingService } from '@/services/embedding.service';

export class VectorSearchHandler implements TaskHandler<SearchTask> {
    public taskType = 'search:vector';

    public async handle(
        task: SearchTask,
        job: Job<SearchTask>
    ): Promise<WorkflowResult<TaskCommonResult>> {
        const childrenValues = (await job.getChildrenValues()) as ChildrenValues;
        if (shouldSkip(childrenValues)) {
            return { skipNextStep: true, data: { hits: [], total: 0 } };
        }

        const embedding = extractUpsteamData(
            childrenValues,
            data => Array.isArray(data.embedding),
            job.id
        )?.embedding as number[] | undefined;

        if (!embedding) {
            throw new UnrecoverableError(
                `No upstream embedding found for vector search job ${job.id}`
            );
        }

        const limit = Math.min(20, Math.max(1, Number(task.payload.metadata?.limit) || 10));
        const result = await EmbeddingService.getNearestVectors(embedding, limit);
        const ids = (result.ids?.[0] || []) as string[];
        const distances = (result.distances?.[0] || []) as number[];
        const hits = ids.map((id, index) => {
            const distance = distances[index] ?? 1;
            return {
                id,
                distance,
                score: Math.max(0, 1 - distance),
                source: 'vector'
            };
        });

        return {
            skipNextStep: false,
            data: {
                hits,
                total: hits.length
            }
        };
    }
}
