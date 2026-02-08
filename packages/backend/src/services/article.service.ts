import { Cacheable } from '@/decorators/cacheable';
import { CacheEvict } from '@/decorators/cache-evict';
import { Article } from '@/entities/article';
import { In, MoreThan } from 'typeorm';
import { createHash } from 'crypto'; // Imported
import { ArticleHistoryService } from './article-history.service'; // Imported
import { ArticleCategory } from '@/shared/article'; // Imported

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
    static async getArticleById(id: string): Promise<Article | null> {
        return await Article.findOne({ where: { id }, relations: ['author'] });
    }

    static async getArticleByIdWithoutCache(id: string): Promise<Article | null> {
        return await Article.findOne({ where: { id }, relations: ['author'] });
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
    static async getRecentArticles(count: number = 20, updatedAfter?: Date): Promise<Article[]> {
        return await Article.find({
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
        });
    }

    /*
     * Get total count of non-deleted articles.
     *
     * Result will be cached for 10 minutes.
     *
     * @return Total article count
     */
    @Cacheable(600, () => 'article:count')
    static async getArticleCount(): Promise<number> {
        return await Article.count({ where: { deleted: false } });
    }

    /*
     * Get articles ordered by view count
     *
     * Result will not be cached
     *
     * @param count Number of articles to retrieve
     * @return List of articles ordered by view count
     */
    static async getArticlesOrderedByViewCount(count: number = 10): Promise<Article[]> {
        return await Article.createQueryBuilder('article')
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
    static async getRecentArticlesWithoutCache(count: number = 10): Promise<Article[]> {
        return await Article.createQueryBuilder('article')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.updatedAt', 'DESC')
            .limit(count)
            .getMany();
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
    static async getArticlesByIds(ids: string[]) {
        if (!ids || ids.length === 0) return [];

        const articles = await Article.find({
            where: { id: In(ids), deleted: false },
            relations: ['author']
        });
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
    static async getArticlesByAuthor(authorId: number) {
        return await Article.find({
            where: { authorId: authorId, deleted: false },
            relations: ['author']
        });
    }

    /*
     * Save an article
     *
     * Will evict cache for the specific article ID
     *
     * @param article Article to save
     */
    @CacheEvict((article: Article) => [`article:${article.id}`, `article:count`])
    static async saveArticle(article: Article) {
        await article.save();
    }

    static async saveLuoguArticle(
        data: any,
        forceUpdate: boolean = false
    ): Promise<{ skipped: boolean; content: string }> {
        let result = { skipped: false, content: '' };

        await Article.transaction(async manager => {
            const hash = createHash('sha256').update(data.content).digest('hex');
            let article = await manager.findOne(Article, {
                where: { id: data.lid },
                lock: { mode: 'pessimistic_write' }
            });

            if (
                !forceUpdate &&
                article &&
                article.title === data.title &&
                article.contentHash === hash
            ) {
                result = { skipped: true, content: '' };
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
            await manager.save(article);
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
