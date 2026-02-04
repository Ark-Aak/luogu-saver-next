import { ChildrenValues, TaskEmbeddingResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { AiTask } from '@/shared/task';
import { UnrecoverableError, Job } from 'bullmq';
import { llm } from '@/lib/llm';
import { extractUpsteamData, getSourceTextById, shouldSkip } from '@/workers/helpers/common.helper';

export class EmbeddingHandler implements TaskHandler<AiTask> {
    public taskType = 'llm:embedding';

    public async handle(
        task: AiTask,
        job: Job<AiTask>
    ): Promise<WorkflowResult<TaskEmbeddingResult>> {
        let content: string | null = null;

        const childrenValues = (await job.getChildrenValues()) as ChildrenValues;

        if (shouldSkip(childrenValues)) {
            return {
                skipNextStep: true,
                data: {
                    embedding: []
                }
            };
        }

        content = extractUpsteamData(
            childrenValues,
            data => typeof data.text === 'string',
            job.id
        )?.text;

        if (!content) {
            if (task.payload.sourceId) {
                content = await getSourceTextById(task.payload.sourceId, job.id);
            } else {
                throw new UnrecoverableError(
                    `No upstream text data found for embedding task in job ${job.id}`
                );
            }
        }

        const textToEmbed = content;
        const { embedding } = await llm.embedding(textToEmbed);
        /*
        await EmbeddingService.upsertVector(
            articleId!,
            {
                title: title!,
                authorId: authorId || 0,
                category: category || 0,
                tags: tags.join(',')
            },
            textToEmbed,
            embedding
        );
         */

        return {
            skipNextStep: false,
            data: {
                embedding
            }
        };
    }
}
