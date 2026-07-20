import { ChromaDataSource } from '@/data-source';
import type { Collection, Metadata } from 'chromadb';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { ArticleService } from '@/services/article.service';
import { runWithConcurrency } from '@/utils/concurrency';
import { llm } from '@/lib/llm';
import type { Article } from '@/entities/article';
import type { TaskEmbeddingRecord } from '@/workers/types';

type ChromaWhere = Record<string, any>;

export type ArticleChunk = {
    index: number;
    start: number;
    end: number;
    text: string;
};

export type ArticleVectorCandidate = {
    id: string;
    score: number;
    distance: number;
    vectorId: string;
    vectorKind: 'summary' | 'chunk' | 'unknown';
    chunkIndex?: number;
    chunkStart?: number;
    chunkEnd?: number;
    chunkText?: string;
};

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

    static async getNearestVectors(embedding: number[], n: number, where?: ChromaWhere) {
        if (!config.chroma.enable) return { ids: [[]], distances: [[]] };
        try {
            if (!embedding || embedding.length === 0) {
                return { ids: [[]], distances: [[]] };
            }
            const collection = await this.getCollection();
            return await collection.query({
                queryEmbeddings: [embedding],
                nResults: n,
                where,
                include: ['distances', 'documents', 'metadatas']
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

    static splitArticleContent(content: string): ArticleChunk[] {
        const chars = Array.from(content || '');
        if (chars.length === 0) return [];

        const chunkSize = Math.max(1, config.rag.chunkSize);
        const overlap = Math.min(Math.max(0, config.rag.chunkOverlap), chunkSize - 1);
        const step = chunkSize - overlap;
        const chunks: ArticleChunk[] = [];

        for (let start = 0; start < chars.length; start += step) {
            const end = Math.min(chars.length, start + chunkSize);
            chunks.push({
                index: chunks.length,
                start,
                end,
                text: chars.slice(start, end).join('')
            });
            if (end >= chars.length) break;
        }

        return chunks;
    }

    static async upsertArticleEmbeddings(article: Article, summary?: string): Promise<number> {
        const summaryDocument = summary?.trim() || article.summary?.trim() || article.content;
        const chunks = this.splitArticleContent(article.content || '');
        const summaryEmbedding = (await llm.embedding(summaryDocument)).embedding;
        const chunkEmbeddings = await Promise.all(
            chunks.map(async chunk => ({
                chunk,
                embedding: (await llm.embedding(chunk.text)).embedding
            }))
        );

        await this.deleteArticleChunkVectors(article.id);
        await this.upsertVector(
            article.id,
            this.buildArticleMetadata(article, {
                articleId: article.id,
                kind: 'summary'
            }),
            summaryDocument,
            summaryEmbedding
        );

        await this.upsertVectors(
            chunkEmbeddings.map(({ chunk, embedding }) => ({
                id: this.getChunkVectorId(article.id, chunk.index),
                metadata: this.buildArticleMetadata(article, {
                    articleId: article.id,
                    kind: 'chunk',
                    chunkIndex: chunk.index,
                    start: chunk.start,
                    end: chunk.end
                }),
                document: chunk.text,
                embedding
            }))
        );

        const vectorCount = 1 + chunkEmbeddings.length;
        logger.info(
            { articleId: article.id, vectorCount, chunkCount: chunkEmbeddings.length },
            'Rebuilt article embeddings'
        );

        return vectorCount;
    }

    static async upsertArticleEmbeddingRecords(
        article: Article,
        records: TaskEmbeddingRecord[]
    ): Promise<number> {
        const validRecords = records.filter(
            record =>
                record.document && Array.isArray(record.embedding) && record.embedding.length > 0
        );
        const summaryRecord = validRecords.find(record => record.kind === 'summary');
        const chunkRecords = validRecords.filter(record => record.kind === 'chunk');

        if (!summaryRecord) {
            throw new Error(`Missing summary embedding record for article ${article.id}`);
        }

        await this.deleteArticleChunkVectors(article.id);

        const vectorRecords = [
            {
                id: article.id,
                metadata: this.buildArticleMetadata(article, {
                    articleId: article.id,
                    kind: 'summary'
                }),
                document: summaryRecord.document,
                embedding: summaryRecord.embedding
            },
            ...chunkRecords.map((record, index) => {
                const chunkIndex = record.chunkIndex ?? index;
                const chunkMetadata: Metadata = {
                    articleId: article.id,
                    kind: 'chunk',
                    chunkIndex
                };
                if (record.start !== undefined) chunkMetadata.start = record.start;
                if (record.end !== undefined) chunkMetadata.end = record.end;
                return {
                    id: this.getChunkVectorId(article.id, chunkIndex),
                    metadata: this.buildArticleMetadata(article, chunkMetadata),
                    document: record.document,
                    embedding: record.embedding
                };
            })
        ];

        await this.upsertVectors(vectorRecords);
        logger.info(
            {
                articleId: article.id,
                vectorCount: vectorRecords.length,
                chunkCount: chunkRecords.length
            },
            'Updated article embeddings from upstream records'
        );
        return vectorRecords.length;
    }

    static async upsertVectors(
        records: { id: string; metadata: Metadata; document: string; embedding: number[] }[]
    ) {
        if (!config.chroma.enable || records.length === 0) return;
        try {
            const collection = await this.getCollection();
            await collection.upsert({
                ids: records.map(record => record.id),
                metadatas: records.map(record => record.metadata),
                documents: records.map(record => record.document),
                embeddings: records.map(record => record.embedding)
            });
            logger.info({ count: records.length }, 'Upserted vectors to Chroma');
        } catch (error) {
            logger.error({ error }, 'Failed to upsert vectors');
            throw error;
        }
    }

    static async deleteArticleChunkVectors(articleId: string) {
        if (!config.chroma.enable) return;
        try {
            const collection = await this.getCollection();
            await collection.delete({
                where: {
                    $and: [{ articleId }, { kind: 'chunk' }]
                }
            });
        } catch (error) {
            logger.warn({ error, articleId }, 'Failed to delete article chunk vectors');
        }
    }

    static async getNearestArticleCandidates(
        embedding: number[],
        distinctArticleLimit: number = config.rag.candidateArticleLimit,
        rawVectorLimit: number = config.rag.rawVectorResultLimit
    ): Promise<ArticleVectorCandidate[]> {
        const result = await this.getNearestVectors(embedding, rawVectorLimit);
        const ids = result.ids?.[0] || [];
        const distances = result.distances?.[0] || [];
        const metadatas = 'metadatas' in result ? result.metadatas?.[0] || [] : [];
        const documents = 'documents' in result ? result.documents?.[0] || [] : [];
        const candidates = new Map<string, ArticleVectorCandidate>();

        ids.forEach((vectorId, index) => {
            const metadata = metadatas[index] || {};
            const distance = Number(distances[index] ?? 1);
            const score = Math.max(0, 1 - distance);
            const articleId = this.extractArticleId(vectorId, metadata);
            if (!articleId) return;

            const candidate: ArticleVectorCandidate = {
                id: articleId,
                score,
                distance,
                vectorId,
                vectorKind: this.normalizeVectorKind(metadata.kind),
                chunkIndex: this.toOptionalNumber(metadata.chunkIndex),
                chunkStart: this.toOptionalNumber(metadata.start),
                chunkEnd: this.toOptionalNumber(metadata.end),
                chunkText: documents[index] || undefined
            };

            const current = candidates.get(articleId);
            if (!current || candidate.score > current.score) {
                candidates.set(articleId, candidate);
            }
        });

        return [...candidates.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, distinctArticleLimit);
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
                    await this.upsertArticleEmbeddings(article);
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

    private static getChunkVectorId(articleId: string, index: number) {
        return `${articleId}:chunk:${index}`;
    }

    private static buildArticleMetadata(article: Article, metadata: Metadata): Metadata {
        return {
            title: article.title,
            authorId: article.authorId,
            category: article.category,
            tags: article.tags.join(','),
            ...metadata
        };
    }

    private static extractArticleId(vectorId: string, metadata: Metadata) {
        const metadataArticleId = metadata.articleId;
        if (typeof metadataArticleId === 'string' && metadataArticleId) return metadataArticleId;
        const chunkIndex = vectorId.indexOf(':chunk:');
        if (chunkIndex >= 0) return vectorId.slice(0, chunkIndex);
        return vectorId;
    }

    private static normalizeVectorKind(value: Metadata[string]): 'summary' | 'chunk' | 'unknown' {
        if (value === 'summary' || value === 'chunk') return value;
        return 'unknown';
    }

    private static toOptionalNumber(value: Metadata[string]) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : undefined;
    }
}
