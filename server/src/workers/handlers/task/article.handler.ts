import type { SaveTask, TaskHandler } from '@/shared/task';
import { fetch } from '@/utils/fetch';
import { C3vkMode } from '@/shared/c3vk';
import type { ArticleData, LentilleDataResponse, UserSummary } from '@/types/luogu-api';
import { createHash } from 'crypto';
import { ArticleService } from '@/services/article.service';
import { ArticleHistoryService } from '@/services/article-history.service';
import { UserService } from '@/services/user.service';
import { Article } from '@/entities/article';
import { User } from '@/entities/user';
import { ArticleCategory } from "@/shared/article";
import { logger } from '@/lib/logger';
import { buildUser } from '@/utils/luogu-api';

function sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export class ArticleHandler implements TaskHandler<SaveTask> {
    public taskType = 'save:article';

    public async handle(task: SaveTask): Promise<void> {
        const url = `https://www.luogu.com/article/${task.payload.targetId}`;
        const resp: LentilleDataResponse<ArticleData> = await fetch(url, C3vkMode.MODERN);

        const incomingUser = buildUser(resp.data.article.author);
        let user = await UserService.getUserByIdWithoutCache(incomingUser.id!);
        if (user) {
            Object.assign(user, incomingUser);
        } else {
            user = User.create(incomingUser) as User;
        }
        await UserService.saveUser(user!);

        const data = resp.data.article;
        const hash = sha256(data.content);
        let article = await ArticleService.getArticleByIdWithoutCache(data.lid);
        if (article && article.title === data.title && article.contentHash === hash) {
            logger.info({ articleId: article.id }, 'Article content unchanged, skipping update');
            return;
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
    }
}