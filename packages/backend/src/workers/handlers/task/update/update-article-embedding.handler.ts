import { UpdateTask } from '@/shared/task';
import { ChildrenValues, TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { Job, UnrecoverableError } from 'bullmq';
import { extractUpsteamData, shouldSkip } from '@/workers/helpers/common.helper';
import { EmbeddingService } from '@/services/embedding.service';
import { ArticleService } from '@/services/article.service';

export class UpdateArticleEmbeddingHandler implements TaskHandler<UpdateTask> {
    public taskType = 'update:article_embedding';

    public async handle(
        task: UpdateTask,
        job: Job<UpdateTask>
    ): Promise<WorkflowResult<TaskCommonResult>> {
        let embedding: number[] | null = null;

        const childrenValues = (await job.getChildrenValues()) as ChildrenValues;

        if (shouldSkip(childrenValues)) {
            return {
                skipNextStep: true,
                data: {}
            };
        }

        embedding = extractUpsteamData(childrenValues, data =>
            Array.isArray(data.embedding)
        )?.embedding;
        if (!embedding) {
            throw new UnrecoverableError(
                `No upstream embedding data found for update article embedding task in job ${job.id}`
            );
        }

        const article = await ArticleService.getArticleById(task.payload.targetId);

        await EmbeddingService.upsertVector(
            task.payload.targetId,
            {
                title: article?.title || '',
                authorId: article?.authorId || 0,
                category: article?.category || 0,
                tags: article?.tags.join(',') || ''
            },
            article?.content || '',
            embedding
        );

        return {
            skipNextStep: false,
            data: {}
        };
    }
}
