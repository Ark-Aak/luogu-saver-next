import { Cacheable } from '@/decorators/cacheable';
import { Article } from '@/entities/article';

export class ArticleService {
    @Cacheable(120, (id) => `article:${id}`, Article)
    static async getArticleById(id: string): Promise<Article | null> {
        return await Article.findOne({ where: { id, deleted: false } });
    }

    @Cacheable(
        600,
        (count, after) => `article:recent:${count}:${after ? after.getTime() : 'all'}`,
        Article
    )
    static async getRecentArticles(count: number = 20, updatedAfter?: Date): Promise<Article[]> {
        const query = Article.createQueryBuilder('article')
            .orderBy('article.priority', 'DESC')
            .addOrderBy('article.updatedAt', 'DESC')
            .limit(count);

        if (updatedAfter) {
            query.andWhere('article.updatedAt > :updatedAfter', { updatedAfter });
        }

        return await query.getMany();
    }

    @Cacheable(600, () => 'article:count')
    static async getArticleCount(): Promise<number> {
        return await Article.count({ where: { deleted: false } });
    }
}