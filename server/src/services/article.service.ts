import { Cacheable } from '@/decorators/cacheable';
import { Article } from '@/entities/article';
import { In } from 'typeorm';

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
            .where('article.deleted = :deleted', { deleted: false })
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

    static async getArticlesOrderedByViewCount(count: number = 10): Promise<Article[]> {
        return await Article.createQueryBuilder('article')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.viewCount', 'DESC')
            .limit(count)
            .getMany();
    }

    static async getRecentArticlesWithoutCache(count: number = 10): Promise<Article[]> {
        return await Article.createQueryBuilder('article')
            .where('article.deleted = :deleted', { deleted: false })
            .orderBy('article.updatedAt', 'DESC')
            .limit(count)
            .getMany();
    }

    static async getRandomArticles(count: number = 10): Promise<Article[]> {
        const recentArticles = await this.getRecentArticlesWithoutCache(3000);
        const shuffled = recentArticles.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    static async getArticlesByIds(ids: string[]) {
        if (!ids || ids.length === 0) return [];

        const articles = await Article.find({
            where: { id: In(ids), deleted: false },
            relations: ['author']
        });
        const articleMap = new Map(articles.map(a => [a.id, a]));
        return ids.map(id => articleMap.get(id)).filter(article => !!article);
    }

    static async getArticlesByAuthor(authorId: number) {
        return await Article.find({
            where: { authorUid: authorId, deleted: false },
            relations: ['author']
        });
    }
}