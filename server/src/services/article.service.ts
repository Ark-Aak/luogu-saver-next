import { Cacheable } from '@/decorators/cacheable';
import { Article } from '@/entities/article';

export class ArticleService {
    @Cacheable(120, (id) => `article:${id}`)
    static async getArticleById(id: string): Promise<Article | null> {
        return await Article.findOne({ where: { id, deleted: false } });
    }

    @Cacheable(600, (count, updatedAfter) => `article:recent:${count}:${updatedAfter ? updatedAfter.getTime() : 'all'}`)
    static async getRecentArticles(count: number = 20, updatedAfter?: Date): Promise<Article[]> {
        const query = Article.createQueryBuilder('article')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.priority', 'DESC')
            .addOrderBy('article.updatedAt', 'DESC')
            .limit(count);

        if (updatedAfter) {
            query.andWhere('article.updatedAt > :updatedAfter', { updatedAfter });
        }

        return await query.getMany();
    }
}