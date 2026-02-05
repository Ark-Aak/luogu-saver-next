import type { SaveTask } from '@/shared/task';
import type { TaskHandler, TaskTextResult, WorkflowResult } from '@/workers/types';
import { fetch } from '@/utils/fetch';
import { C3vkMode } from '@/shared/c3vk';
import type { ArticleData, LentilleDataResponse } from '@/types/luogu-api';
import { createHash } from 'crypto';
import { ArticleService } from '@/services/article.service';
import { ArticleHistoryService } from '@/services/article-history.service';
import { UserService } from '@/services/user.service';
import { Article } from '@/entities/article';
import { ArticleCategory } from '@/shared/article';
import { logger } from '@/lib/logger';
import { buildUser } from '@/utils/luogu-api';
import { emitToRoom } from '@/lib/socket';

function sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export class ArticleHandler implements TaskHandler<SaveTask> {
    public taskType = 'save:article';

    public async handle(task: SaveTask): Promise<WorkflowResult<TaskTextResult>> {
        const url = `https://www.luogu.com/article/${task.payload.targetId}`;
        const resp: LentilleDataResponse<ArticleData> = await fetch(url, C3vkMode.MODERN);

        const incomingUser = buildUser(resp.data.article.author);
        let user = await UserService.getUserByIdWithoutCache(incomingUser.id!);
        if (user) {
            Object.assign(user, incomingUser);
        } else {
            user = UserService.createUser(incomingUser);
        }
        await UserService.saveUser(user!);

        const data = resp.data.article;
        const hash = sha256(data.content);
        let article = await ArticleService.getArticleByIdWithoutCache(data.lid);
        if (
            !task.payload.metadata?.forceUpdate &&
            article &&
            article.title === data.title &&
            article.contentHash === hash
        ) {
            logger.info({ articleId: article.id }, 'Article content unchanged, skipping update');
            return {
                skipNextStep: true,
                data: {
                    text: ''
                }
            };
        }
        const incomingData: Partial<Article> = {
            title: data.title,
            authorId: data.author.uid,
            content: data.content,
            contentHash: hash,
            category: data.category as ArticleCategory,
            solutionForPid: data.solutionFor?.pid,
            upvote: data.upvote,
            favorCount: data.favorCount
        };

        if (article) {
            Object.assign(article, incomingData);
        } else {
            article = new Article();
            article.id = data.lid;
            article.deleted = false;
            article.viewCount = 0;
            article.tags = [];
            article.priority = 0;
            Object.assign(article, incomingData);
        }
        await ArticleService.saveArticle(article);
        await ArticleHistoryService.pushNewVersion(article.id, article.title, article.content);
        emitToRoom(`article_${article.id}`, `article:${article.id}:updated`);

        return {
            skipNextStep: false,
            data: {
                text: article.content
            }
        };
    }
}
