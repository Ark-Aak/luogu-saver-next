import { ArticleHistory } from '@/entities/article-history';
import { CacheEvict } from '@/decorators/cache-evict';
import { Cacheable } from '@/decorators/cacheable';
import { Article } from '@/entities/article'; // Import Article for locking
import { EntityManager } from 'typeorm';
import {
    createServiceEntity,
    findOneServiceEntity,
    findServiceEntities,
    saveServiceEntity
} from '@/services/helpers/repository.helper';

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
    @CacheEvict((articleId: string) => `article_history:${articleId}`)
    public static async pushNewVersion(
        articleId: string,
        title: string,
        content: string,
        transactionalEntityManager?: EntityManager
    ): Promise<void> {
        const run = async (manager: EntityManager) => {
            await findOneServiceEntity<Article>(
                Article,
                {
                    where: { id: articleId },
                    select: ['id'],
                    lock: { mode: 'pessimistic_write' }
                },
                manager
            );

            const latestHistory = await findOneServiceEntity<ArticleHistory>(
                ArticleHistory,
                {
                    where: { articleId },
                    order: { version: 'DESC' },
                    select: ['version']
                },
                manager
            );
            const newVersion = latestHistory ? latestHistory.version + 1 : 1;
            const newHistory = createServiceEntity<ArticleHistory>(
                ArticleHistory,
                {
                    articleId,
                    version: newVersion,
                    title,
                    content
                },
                manager
            );
            await saveServiceEntity<ArticleHistory>(ArticleHistory, newHistory, manager);
        };

        if (transactionalEntityManager) {
            await run(transactionalEntityManager);
        } else {
            await ArticleHistory.transaction(run);
        }
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
    public static async getHistoryByArticleId(
        articleId: string,
        manager?: EntityManager
    ): Promise<ArticleHistory[]> {
        return await findServiceEntities<ArticleHistory>(
            ArticleHistory,
            {
                where: { articleId },
                order: { version: 'ASC' }
            },
            manager
        );
    }
}
