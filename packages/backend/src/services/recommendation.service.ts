import { EmbeddingService } from '@/services/embedding.service';
import { ArticleService } from '@/services/article.service';
import { redisClient } from '@/lib/redis';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { Article } from '@/entities/article';

import stringSimilarity from 'string-similarity';

type RecommendedArticle = Article & { reason: string };

export class RecommendationService {
    private static async getSimilarArticles(id: string, count: number): Promise<string[]> {
        const vector = await EmbeddingService.getVector(id);
        if (!vector) {
            return [];
        }
        const results = await EmbeddingService.getNearestVectors(vector, count + 1);
        const similarIds = results.ids[0].filter((articleId: string) => articleId !== id);
        return similarIds.slice(0, count);
    }

    private static async getNearestArticlesByProfile(
        profile: number[],
        count: number
    ): Promise<string[]> {
        if (!profile) return [];
        const results = await EmbeddingService.getNearestVectors(profile, count);
        return results.ids[0];
    }

    private static async drawProfile(articles: string[]): Promise<number[]> {
        const validItems: { id: string; vec: number[] }[] = [];
        for (const articleId of articles) {
            const vector = await EmbeddingService.getVector(articleId);
            if (vector) {
                validItems.push({ id: articleId, vec: vector });
            }
        }
        if (validItems.length === 0) return [];
        const dimension = validItems[0].vec.length;
        const profile = new Array(dimension).fill(0);
        let factor = 1;
        for (let i = 0; i < validItems.length; i++) {
            const { id, vec } = validItems[i];
            for (let j = 0; j < dimension; j++) {
                profile[j] += vec[j] * factor;
            }
            logger.debug({ factor, articleId: id }, `Drawing profile`);
            factor *= config.recommendation.decayFactor;
        }
        for (let i = 0; i < dimension; i++) profile[i] /= validItems.length;
        return profile;
    }

    private static filterArticles(recommendations: string[], articles: Set<string>): string[] {
        const filtered: string[] = [];
        for (const articleId of recommendations) {
            if (!articles.has(articleId)) {
                filtered.push(articleId);
            }
        }
        return filtered;
    }

    static async recordAnonymousBehavior(deviceId: string, articleId: string) {
        try {
            const key = `anon_behavior:${deviceId}`;
            const now = Date.now();
            await redisClient.zadd(key, now, articleId);
            await redisClient.zremrangebyrank(
                key,
                0,
                -config.recommendation.anonymous.maxCount - 1
            );
            await redisClient.expire(key, config.recommendation.anonymous.expireTime);
        } catch (error) {
            logger.error({ error, deviceId, articleId }, `Failed to record anonymous behavior`);
        }
    }

    static async recordRecommendedArticles(deviceId: string, articleIds: string[]) {
        try {
            const key = `anon_recommendations:${deviceId}`;
            const now = Date.now();
            const entries: (string | number)[] = [];
            for (const articleId of articleIds) {
                entries.push(now, articleId);
            }
            if (entries.length > 0) {
                await redisClient.zadd(key, ...entries);
                await redisClient.zremrangebyrank(
                    key,
                    0,
                    -config.recommendation.anonymous.maxCount - 1
                );
                await redisClient.expire(key, 3 * 60 * 60);
            }
        } catch (error) {
            logger.error({ error, deviceId, articleIds }, `Failed to record recommended articles`);
        }
    }

    static async getRecommendedArticles(deviceId: string) {
        try {
            const key = `anon_recommendations:${deviceId}`;
            return redisClient.zrange(key, 0, -1);
        } catch (error) {
            logger.error({ error, deviceId }, `Failed to get recommended articles`);
            return [];
        }
    }

    private static filterUselessFields(
        articles: RecommendedArticle[]
    ): Partial<RecommendedArticle>[] {
        return articles.map((article: RecommendedArticle) => {
            return {
                id: article.id,
                title: article.title,
                summary: article.content.slice(0, 100),
                author: article.author,
                updatedAt: article.updatedAt,
                category: article.category,
                tags: article.tags,
                reason: article.reason
            };
        });
    }

    static async getAnonymousRecommendations(deviceId: string, count: number = 10) {
        const key = `anon_behavior:${deviceId}`;
        const articleIds = await redisClient.zrevrange(
            key,
            0,
            config.recommendation.anonymous.maxCount - 1
        );
        const profile = await this.drawProfile(articleIds);
        const vectorResults = await this.getNearestArticlesByProfile(profile, count * 5);
        const randomResults = (await ArticleService.getRandomArticles(20)).map(a => a.id);
        const hotResults = (await ArticleService.getArticlesOrderedByViewCount(50)).map(a => a.id);
        logger.debug(
            {
                deviceId,
                vL: vectorResults.length,
                rL: randomResults.length,
                hL: hotResults.length
            },
            `Anonymous recommendations`
        );
        logger.debug(
            { deviceId, profile: profile?.slice(0, 5).map(v => v.toFixed(4)) },
            `Profile vector`
        );
        logger.debug({ deviceId, articleIds }, `Read articles`);
        logger.debug({ deviceId, randomResults }, `Random articles`);
        logger.debug({ deviceId, hotResults }, `Hot articles`);
        const recommendations = [...vectorResults, ...randomResults, ...hotResults];
        recommendations.sort(() => 0.5 - Math.random());
        const readArticles = new Set(articleIds);
        const previouslyRecommended = await this.getRecommendedArticles(deviceId);
        for (const recId of previouslyRecommended) readArticles.add(recId);
        const filtered = this.filterArticles(recommendations, readArticles).slice(0, count);
        const result: Article[] = await ArticleService.getArticlesByIds(filtered);
        await this.recordRecommendedArticles(deviceId, filtered);
        logger.debug({ deviceId, recommendation: filtered }, `Final recommendations`);
        const resultWithReason: RecommendedArticle[] = [];
        for (const article of result) {
            if (vectorResults.includes(article.id))
                resultWithReason.push({
                    ...article,
                    reason: 'vector'
                } as RecommendedArticle);
            else if (randomResults.includes(article.id))
                resultWithReason.push({
                    ...article,
                    reason: 'random'
                } as RecommendedArticle);
            else if (hotResults.includes(article.id))
                resultWithReason.push({
                    ...article,
                    reason: 'hot'
                } as RecommendedArticle);
            else
                resultWithReason.push({
                    ...article,
                    reason: 'other'
                } as RecommendedArticle);
        }
        return this.filterUselessFields(resultWithReason);
    }

    static async getRelevantArticle(articleId: string, fromVector: number = 5) {
        const similarIds = await this.getSimilarArticles(articleId, fromVector * 3);
        const article = await ArticleService.getArticleById(articleId);
        const originTitle = article?.title || '';
        const authorId = article?.authorId || 0;
        const authorArticles = (await ArticleService.getArticlesByAuthor(authorId)).map(a => ({
            id: a.id,
            title: a.title
        }));
        const finalResult = [],
            titleSimilarIds = [];
        for (const article of authorArticles) {
            const similarity = stringSimilarity.compareTwoStrings(originTitle, article.title);
            if (similarity >= config.recommendation.relevantThreshold) {
                if (article.id !== articleId) finalResult.push(article.id);
                titleSimilarIds.push(article.id);
            }
            logger.debug(
                { articleId: article.id, title: article.title, similarity },
                `Title similarity check`
            );
        }
        let appendedCount = 1;
        for (const simId of similarIds) {
            if (!finalResult.includes(simId)) {
                finalResult.push(simId);
            }
            if (appendedCount >= fromVector) break;
            appendedCount++;
        }
        const articles = await ArticleService.getArticlesByIds(finalResult);
        const articlesWithReason: RecommendedArticle[] = [];
        for (const article of articles) {
            if (titleSimilarIds.includes(article.id))
                articlesWithReason.push({
                    ...article,
                    reason: 'title'
                } as RecommendedArticle);
            else
                articlesWithReason.push({
                    ...article,
                    reason: 'vector'
                } as RecommendedArticle);
        }
        return this.filterUselessFields(articlesWithReason);
    }
}
