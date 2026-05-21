import { UpdateTask } from '@/shared/task';
import { TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { UnrecoverableError } from 'bullmq';
import { ArticleService } from '@/services/article.service';
import { SearchService } from '@/services/search.service';

export class UpdateSearchIndexHandler implements TaskHandler<UpdateTask> {
    public taskType = 'update:search_index';

    public async handle(task: UpdateTask): Promise<WorkflowResult<TaskCommonResult>> {
        const articleId = task.payload.targetId;
        const article = await ArticleService.getArticleByIdWithAuthorWithoutCache(articleId);

        if (!article) {
            throw new UnrecoverableError(`Article with id ${articleId} not found for search index`);
        }

        const indexed = await SearchService.upsertArticle(article);

        return {
            skipNextStep: false,
            data: {
                indexed,
                articleId
            }
        };
    }
}
