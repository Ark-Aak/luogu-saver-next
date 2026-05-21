import { UpdateTask } from '@/shared/task';
import { TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { ArticleService } from '@/services/article.service';
import { SearchService } from '@/services/search.service';
import { generateArticleSummary } from '@/workers/handlers/task/llm/summary.handler';
import { logger } from '@/lib/logger';

export class UpdateArticleSummaryRebuildHandler implements TaskHandler<UpdateTask> {
    public taskType = 'update:article_summary_rebuild';

    public async handle(task: UpdateTask): Promise<WorkflowResult<TaskCommonResult>> {
        const batchSize = Math.min(
            100,
            Math.max(1, Math.floor(Number(task.payload.metadata?.batchSize) || 20))
        );
        const failedArticleIds: string[] = [];
        let processed = 0;
        let updated = 0;
        let afterId: string | null = null;

        while (true) {
            const articles = await ArticleService.getArticlesForSummaryRebuild(afterId, batchSize);
            if (articles.length === 0) break;

            for (const article of articles) {
                afterId = article.id;
                processed += 1;
                try {
                    article.summary = await generateArticleSummary(article.content);
                    await ArticleService.saveArticle(article);
                    await SearchService.upsertArticle(article);
                    updated += 1;
                } catch (error) {
                    failedArticleIds.push(article.id);
                    logger.error(
                        { error, articleId: article.id },
                        'Failed to rebuild article summary'
                    );
                }
            }
        }

        return {
            skipNextStep: false,
            data: {
                processed,
                updated,
                failed: failedArticleIds.length,
                failedArticleIds
            }
        };
    }
}
