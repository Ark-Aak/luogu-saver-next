import { ChromaDataSource } from '@/data-source';
import type { Collection, Metadata } from 'chromadb';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { ArticleService } from '@/services/article.service';
import { runWithConcurrency } from '@/utils/concurrency';
import { llm } from '@/lib/llm';

export type ArticleEmbeddingRebuildResult = {
    processed: number;
    updated: number;
    failed: number;
    failedArticleIds: string[];
};

export class EmbeddingService {
    private static _collection: Collection | null = null;
    private static _collectionPromise: Promise<Collection> | null = null;

    private static async getCollection(): Promise<Collection> {
        if (this._collection) return this._collection;

        if (!this._collectionPromise) {
            this._collectionPromise = ChromaDataSource.getOrCreateCollection({
                name: config.chroma.collectionName
            })
                .then(collection => {
                    this._collection = collection;
                    logger.info(
                        { collection: config.chroma.collectionName },
                        'Chroma collection loaded successfully'
                    );
                    return collection;
                })
                .catch(error => {
                    this._collectionPromise = null;
                    logger.error(
                        { error, collection: config.chroma.collectionName },
                        'Failed to get Chroma collection'
                    );
                    throw error;
                });
        }

        return this._collectionPromise;
    }

    static async getVector(articleId: string) {
        if (!config.chroma.enable) return [];
        const collection = await this.getCollection();
        try {
            const targetData = await collection.get({
                ids: [articleId],
                include: ['embeddings']
            });
            if (!targetData || targetData.ids.length === 0) {
                return null;
            }
            return targetData.embeddings[0];
        } catch (error) {
            logger.error({ error, articleId }, `Failed to get vector`);
            return null;
        }
    }

    static async getNearestVectors(embedding: number[], n: number) {
        if (!config.chroma.enable) return { ids: [[]], distances: [[]] };
        try {
            if (!embedding || embedding.length === 0) {
                return { ids: [[]], distances: [[]] };
            }
            const collection = await this.getCollection();
            return await collection.query({
                queryEmbeddings: [embedding],
                nResults: n
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get nearest vectors');
            return { ids: [[]], distances: [[]] };
        }
    }

    static async upsertVector(
        id: string,
        metadata: Metadata,
        document: string,
        embedding: number[]
    ) {
        if (!config.chroma.enable) return;
        try {
            const collection = await this.getCollection();
            await collection.upsert({
                ids: [id],
                metadatas: [metadata],
                documents: [document],
                embeddings: [embedding]
            });
            logger.info({ id }, 'Upserted vector to Chroma');
        } catch (error) {
            logger.error({ error, id }, 'Failed to upsert vector');
            throw error;
        }
    }

    static async rebuildArticleEmbeddings(
        batchSize: number = 20,
        concurrency: number = 5
    ): Promise<ArticleEmbeddingRebuildResult> {
        const failedArticleIds: string[] = [];
        let processed = 0;
        let updated = 0;
        let afterId: string | null = null;

        while (true) {
            const articles = await ArticleService.getArticlesForEmbeddingRebuild(
                afterId,
                batchSize
            );
            if (articles.length === 0) break;
            afterId = articles[articles.length - 1].id;

            await runWithConcurrency(articles, concurrency, async article => {
                processed += 1;
                try {
                    const document = article.summary?.trim() || article.content;
                    const { embedding } = await llm.embedding(document);
                    await this.upsertVector(
                        article.id,
                        {
                            title: article.title,
                            authorId: article.authorId,
                            category: article.category,
                            tags: article.tags.join(',')
                        },
                        document,
                        embedding
                    );
                    updated += 1;
                } catch (error) {
                    failedArticleIds.push(article.id);
                    logger.error(
                        { error, articleId: article.id },
                        'Failed to rebuild article embedding'
                    );
                }
            });
        }

        return {
            processed,
            updated,
            failed: failedArticleIds.length,
            failedArticleIds
        };
    }
}
