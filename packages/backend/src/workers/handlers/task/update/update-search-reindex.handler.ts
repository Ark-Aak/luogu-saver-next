import { UpdateTask } from '@/shared/task';
import { TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { SearchService } from '@/services/search.service';

export class UpdateSearchReindexHandler implements TaskHandler<UpdateTask> {
    public taskType = 'update:search_reindex';

    public async handle(task: UpdateTask): Promise<WorkflowResult<TaskCommonResult>> {
        const batchSize = Math.min(
            500,
            Math.max(1, Number(task.payload.metadata?.batchSize) || 100)
        );
        const indexed = await SearchService.reindexArticles(batchSize);

        return {
            skipNextStep: false,
            data: { indexed }
        };
    }
}
