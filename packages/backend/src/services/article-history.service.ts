import { ArticleHistory } from '@/entities/article-history';
import { CacheEvict } from '@/decorators/cache-evict';
import { Cacheable } from '@/decorators/cacheable';

export class ArticleHistoryService {
    /*
     * Push a new version of the article content to the history
     *
     * Will evict the cache for the article history
     *
     * @param articleId - The ID of the article
     * @param title - The title of the article
     * @param content - The content of the article
     */
    @CacheEvict((articleId: string, title: string, content: string) => `article_history:${articleId}`)
    public static async pushNewVersion(articleId: string, title: string, content: string): Promise<void> {
        const latestHistory = await ArticleHistory.findOne({
            where: { articleId },
            order: { version: 'DESC' }
        });
        const newVersion = latestHistory ? latestHistory.version + 1 : 1;
        const newHistory = ArticleHistory.create({
            articleId,
            version: newVersion,
            title,
            content
        });
        await newHistory.save();
    }

    /*
     * Get the history of an article by its ID
     *
     * Result will be cached for 10 minutes
     *
     * @param articleId - The ID of the article
     * @returns An array of ArticleHistory entries
     */
    @Cacheable(600, (articleId: string) => `article_history:${articleId}`, ArticleHistory)
    public static async getHistoryByArticleId(articleId: string): Promise<ArticleHistory[]> {
        return await ArticleHistory.find({
            where: { articleId },
            order: { version: 'ASC' }
        });
    }
}
