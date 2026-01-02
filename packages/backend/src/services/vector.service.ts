import { ChromaDataSource } from '@/data-source';
import type { Collection } from 'chromadb';
import { config } from '@/config';
import { logger } from '@/lib/logger';

export class VectorService {
    private static _collection: Collection | null = null;

    private static async getCollection(): Promise<Collection> {
        if (!this._collection) {
            try {
                this._collection = await ChromaDataSource.getCollection({ name: config.chroma.collectionName });
                logger.info({ collection: config.chroma.collectionName }, 'Chroma collection loaded successfully');
            } catch (error) {
                logger.error({ error, collection: config.chroma.collectionName }, 'Failed to get Chroma collection');
            }
        }
        if (!this._collection) {
            throw new Error('Unable to get Chroma collection');
        }
        return this._collection;
    }

    static async getVector(articleId: string) {
        const collection = await this.getCollection();
        try {
            const targetData = await collection.get({ ids: [articleId], include: ['embeddings'] });
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
}
