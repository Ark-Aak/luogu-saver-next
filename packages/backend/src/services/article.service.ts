import { Cacheable } from '@/decorators/cacheable';
import { CacheEvict } from '@/decorators/cache-evict';
import { Article } from '@/entities/article';
import { EntityManager, In, MoreThan } from 'typeorm';
import { ArticleHistoryService } from './article-history.service';
import { ArticleCategory } from '@/shared/article';
import {
    findOneServiceEntity,
    findServiceEntities,
    getServiceRepository,
    saveServiceEntity
} from '@/services/helpers/repository.helper';
import { saveHashedContent } from '@/services/helpers/hashed-content.helper';
import type { Article as LuoguArticle } from '@/types/luogu-api';

export class ArticleService {
    /*
     * Get article by ID.
     *
     * Result will be cached for 10 minutes.
     *
     * @param id Article ID
     * @return Article or null if not found
     */
    @Cacheable(600, id => `article:${id}`, Article)
    static async getArticleById(id: string, manager?: EntityManager): Promise<Article | null> {
        return await findOneServiceEntity<Article>(
            Article,
            { where: { id }, relations: ['author'] },
            manager
        );
    }

    static async getArticleByIdWithoutCache(id: string): Promise<Article | null> {
        return await this.getArticleById(id, Article.getRepository().manager);
    }

    static async getArticleByIdWithAuthorWithoutCache(id: string): Promise<Article | null> {
        return await findOneServiceEntity<Article>(
            Article,
            { where: { id }, relations: ['author'] },
            Article.getRepository().manager
        );
    }

    /*
     * Get recent articles ordered by priority and updatedAt.
     *
     * Result will be cached for 10 minutes.
     *
     * @param count Number of articles to retrieve
     * @param updatedAfter Optional date to filter articles updated after this date
     * @return List of recent articles
     */
    @Cacheable(
        600,
        (count, after) => `article:recent:${count}:${after ? after.getTime() : 'all'}`,
        Article
    )
    static async getRecentArticles(
        count: number = 20,
        updatedAfter?: Date,
        manager?: EntityManager
    ): Promise<Article[]> {
        return await findServiceEntities<Article>(
            Article,
            {
                where: {
                    deleted: false,
                    updatedAt: updatedAfter ? MoreThan(updatedAfter) : undefined
                },
                order: {
                    priority: 'DESC',
                    updatedAt: 'DESC'
                },
                take: count,
                relations: ['author']
            },
            manager
        );
    }

    /*
     * Get total count of non-deleted articles.
     *
     * Result will be cached for 10 minutes.
     *
     * @return Total article count
     */
    @Cacheable(600, () => 'article:count')
    static async getArticleCount(manager?: EntityManager): Promise<number> {
        return await getServiceRepository<Article>(Article, manager).count({
            where: { deleted: false }
        });
    }

    /*
     * Get articles ordered by view count
     *
     * Result will not be cached
     *
     * @param count Number of articles to retrieve
     * @return List of articles ordered by view count
     */
    static async getArticlesOrderedByViewCount(
        count: number = 10,
        manager?: EntityManager
    ): Promise<Article[]> {
        return await getServiceRepository<Article>(Article, manager)
            .createQueryBuilder('article')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.viewCount', 'DESC')
            .limit(count)
            .getMany();
    }

    /*
     * Get recent articles without caching
     *
     * Result will not be cached
     *
     * @param count Number of articles to retrieve
     * @return List of recent articles
     */
    static async getRecentArticlesWithoutCache(
        count: number = 10,
        manager?: EntityManager
    ): Promise<Article[]> {
        return await getServiceRepository<Article>(Article, manager)
            .createQueryBuilder('article')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.updatedAt', 'DESC')
            .limit(count)
            .getMany();
    }

    static async getArticlesForSearchReindex(
        skip: number,
        take: number,
        manager?: EntityManager
    ): Promise<Article[]> {
        return await getServiceRepository<Article>(Article, manager)
            .createQueryBuilder('article')
            .leftJoinAndSelect('article.author', 'author')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.updatedAt', 'ASC')
            .skip(skip)
            .take(take)
            .getMany();
    }

    static async getArticlesForSummaryRebuild(
        afterId: string | null,
        take: number,
        manager?: EntityManager
    ): Promise<Article[]> {
        const query = getServiceRepository<Article>(Article, manager)
            .createQueryBuilder('article')
            .leftJoinAndSelect('article.author', 'author')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.id', 'ASC')
            .take(take);

        if (afterId) {
            query.andWhere('article.id > :afterId', { afterId });
        }

        return await query.getMany();
    }

    static async getArticlesForEmbeddingRebuild(
        afterId: string | null,
        take: number,
        manager?: EntityManager
    ): Promise<Article[]> {
        return await this.getArticlesForSummaryRebuild(afterId, take, manager);
    }

    /*
     * Get random articles from recent articles
     *
     * Result will not be cached
     *
     * @param count Number of articles to retrieve
     * @return List of random articles
     */
    static async getRandomArticles(count: number = 10): Promise<Article[]> {
        const recentArticles = await this.getRecentArticlesWithoutCache(3000);
        const shuffled = recentArticles.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /*
     * Get articles by a list of IDs
     *
     * Result will not be cached
     *
     * @param ids List of article IDs
     * @return List of articles matching the IDs
     */
    static async getArticlesByIds(ids: string[], manager?: EntityManager) {
        if (!ids || ids.length === 0) return [];

        const articles = await findServiceEntities<Article>(
            Article,
            {
                where: { id: In(ids), deleted: false },
                relations: ['author']
            },
            manager
        );
        const articleMap = new Map(articles.map(a => [a.id, a]));
        return ids.map(id => articleMap.get(id)).filter(article => !!article);
    }

    /*
     * Get articles by author ID
     *
     * Result will not be cached
     *
     * @param authorId Author ID
     * @return List of articles by the author
     */
    static async getArticlesByAuthor(authorId: number, manager?: EntityManager) {
        return await findServiceEntities<Article>(
            Article,
            {
                where: { authorId: authorId, deleted: false },
                relations: ['author']
            },
            manager
        );
    }

    /*
     * Save an article
     *
     * Will evict cache for the specific article ID
     *
     * @param article Article to save
     */
    @CacheEvict((article: Article) => [`article:${article.id}`, `article:count`])
    static async saveArticle(article: Article, manager?: EntityManager) {
        await saveServiceEntity<Article>(Article, article, manager);
    }

    @CacheEvict((article: LuoguArticle) => [`article:${article.lid}`, `article:count`])
    static async saveLuoguArticle(
        data: LuoguArticle,
        forceUpdate: boolean = false
    ): Promise<{ skipped: boolean; content: string }> {
        let result = { skipped: false, content: '' };

        await Article.transaction(async manager => {
            const saveResult = await saveHashedContent<Article>({
                manager,
                entity: Article,
                id: data.lid,
                content: data.content,
                forceUpdate,
                incomingData: {
                    title: data.title,
                    authorId: data.author.uid,
                    category: data.category as ArticleCategory,
                    solutionForPid: data.solutionFor?.pid,
                    upvote: data.upvote,
                    favorCount: data.favorCount
                },
                defaults: {
                    deleted: false,
                    viewCount: 0,
                    tags: [],
                    priority: 0
                },
                isUnchanged: (article, hash) =>
                    article.title === data.title && article.contentHash === hash
            });

            if (saveResult.skipped || !saveResult.entity) {
                result = { skipped: true, content: '' };
                return;
            }

            const article = saveResult.entity;
            await ArticleHistoryService.pushNewVersion(
                article.id,
                article.title,
                article.content,
                manager
            );

            result = { skipped: false, content: article.content };
        });

        return result;
    }
}
